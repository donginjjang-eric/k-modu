import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureMasterAdminRole, ensureMasterPartnerWorkspace, getCreatorAccountForUser, getDesignerForUser, getDesignerForUserAndId, getOrCreateAdminCreatorAccount, getOrCreateAdminDesignerAccount, getUserByEmail, hasDatabase } from "./db";
import { hasActiveAgencyGroupRelationship } from "./creator-management";
import { brandPartnerCenterPath } from "./brand-partner-center";
import { isMasterAdminEmail } from "./master-admin";
import type { CreatorAccount, Role, User, WorkspaceType } from "./types";
import { backfillUserWorkspaceMemberships, listUserWorkspaces, resolveUserWorkspace } from "./workspace-access";
import { authorizeWorkspace, workspaceCookieName } from "./workspace-selection";
import { authorizePartnerResource, parsePartnerWorkspaceType } from "./partner-workspace-access";

export const sessionCookieName = "kmodu_session";
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export type SessionUser = Pick<User, "id" | "email" | "role"> & { exp: number; name?: string; avatar?: string };

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }
  return "kmodu-local-dev-secret";
}

function sign(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

export function hashPassword(password: string, salt = randomBytes(16).toString("base64url")) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("base64url");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  if (!passwordHash.includes(":")) {
    if (process.env.NODE_ENV === "production") return false;
    return password === passwordHash;
  }

  const [salt, expectedHash] = passwordHash.split(":");
  const actualHash = hashPassword(password, salt).split(":")[1];
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(actualHash);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSessionToken(user: Pick<User, "id" | "email" | "role"> & { name?: string; avatar?: string }) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    // 구글 로그인 시 프로필 이름/사진을 함께 담는다 (계정 카드 표시용). 일반 로그인은 없음.
    ...(user.name ? { name: user.name } : {}),
    ...(user.avatar ? { avatar: user.avatar } : {}),
    exp: Date.now() + sessionMaxAgeSeconds * 1000,
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token?: string | null): SessionUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(sessionCookieName)?.value);
  if (!session || !isMasterAdminEmail(session.email)) return session;
  await ensureMasterAdminRole(session.id, session.email).catch((error) => {
    console.error("[master-admin] role persistence failed:", error instanceof Error ? error.message : error);
  });
  return { ...session, role: "admin" as const };
}

type BrandAwareRole = Role | (Pick<User, "role"> & { brand_category?: unknown });

export function loginEntryUrl(value: BrandAwareRole) {
  const role = typeof value === "string" ? value : value.role;
  if (role === "admin") return "/dashboard/admin";
  if (role === "creator") return "/dashboard/creator";
  if (role === "agency") return "/dashboard/agency";
  const brandCategory = typeof value === "string" ? undefined : value.brand_category;
  return brandPartnerCenterPath(brandCategory);
}

export function passwordLoginDestination(value: BrandAwareRole, requestedNext: unknown) {
  const next = String(requestedNext || "");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  return safeNext || loginEntryUrl(value);
}

// 입구별 로그인 후 복귀 목적지. 로그인 자체는 메인으로 돌아가고, 입구로 들어온 경우만 그 목적지로 보낸다.
function loginPromptUrl(role: Role, destination = loginEntryUrl(role)) {
  return `/login?notice=${role}_login&next=${encodeURIComponent(destination)}`;
}

export async function requireUser(role?: Role) {
  const user = await getCurrentUser();
  // 비로그인: 어떤 입구(관리자/디자이너)로 들어왔는지 알리고, 로그인 후 그 입구의 목적지로 복귀시킨다.
  if (!user) redirect(role ? loginPromptUrl(role) : "/login");
  // 로그인은 했지만 권한이 다른 경우: 어떤 계정이 필요한지 로그인 페이지에서 안내한다.
  if (role && user.role !== role) redirect(`/login?error=${role}_required`);
  return user;
}

// 관리자는 모든 영역에 입장 가능. 스튜디오는 계정에 연결된 디자이너 프로필로 동작한다.
export async function requireApprovedDesigner(loginDestination = loginEntryUrl("designer")) {
  const user = await getCurrentUser();
  if (!user) redirect(loginPromptUrl("designer", loginDestination));
  if (user.role !== "designer" && user.role !== "admin") redirect("/login?error=designer_required");

  const designer = await getDesignerForUser(user.id);
  if (user.role === "admin") {
    const adminDesigner = designer || await getOrCreateAdminDesignerAccount(user.id, user.email);
    if (!adminDesigner) redirect("/login?notice=studio_profile_required");
    return { user, designer: adminDesigner };
  }
  if (!designer || designer.approval_status === "disabled" || designer.approval_status === "rejected") redirect("/login?error=designer_required");
  return { user, designer };
}

function workspaceLoginRole(type: WorkspaceType): Role | undefined {
  if (type === "admin") return "admin";
  if (type === "creator") return "creator";
  if (type === "agency") return "agency";
  return "designer";
}

export async function requireWorkspace(type: WorkspaceType) {
  const user = await getCurrentUser();
  const loginRole = workspaceLoginRole(type);
  const destination = type === "beauty_partner"
    ? "/dashboard/beauty"
    : type === "fashion_partner"
      ? "/dashboard/designer/brand"
      : loginEntryUrl(loginRole || "designer");
  if (!user) redirect(loginRole ? loginPromptUrl(loginRole, destination) : "/login");

  if (!hasDatabase()) return { user, workspace: null };

  let memberships = await listUserWorkspaces(user.id);
  if (!memberships.some((membership) => membership.workspace_type === type)) {
    await backfillUserWorkspaceMemberships(user.id, type);
    memberships = await listUserWorkspaces(user.id);
  }

  let provisionedMembershipId: string | null = null;
  if ((type === "fashion_partner" || type === "beauty_partner") && isMasterAdminEmail(user.email)) {
    const oppositeType = type === "fashion_partner" ? "beauty_partner" : "fashion_partner";
    const activeForType = memberships.filter((membership) => membership.workspace_type === type && membership.status === "active");
    const oppositeResourceIds = new Set(memberships
      .filter((membership) => membership.workspace_type === oppositeType && membership.status === "active")
      .map((membership) => membership.resource_id));
    const hasDedicatedWorkspace = activeForType.some((membership) => !oppositeResourceIds.has(membership.resource_id));
    if (!hasDedicatedWorkspace) {
      const provisioned = await ensureMasterPartnerWorkspace({
        userId: user.id,
        email: user.email,
        workspaceType: type,
        allowMasterProvision: true,
      });
      provisionedMembershipId = provisioned.id;
      memberships = await listUserWorkspaces(user.id);
    }
  }

  const selectedId = (await cookies()).get(workspaceCookieName)?.value || null;
  const matching = memberships.filter((membership) => membership.workspace_type === type && membership.status === "active");
  const membershipId = provisionedMembershipId
    || (selectedId && matching.some((membership) => membership.id === selectedId)
    ? selectedId
    : matching.length === 1
      ? matching[0].id
      : isMasterAdminEmail(user.email) && matching.length > 0
        ? matching[0].id
        : null);

  if (!membershipId) redirect(`/dashboard/workspaces?next=${encodeURIComponent(destination)}`);
  const membership = await resolveUserWorkspace({ userId: user.id, workspaceType: type, membershipId, requireActive: true });
  const authorization = authorizeWorkspace({ user, requestedType: type, membership });
  if (!authorization.ok) redirect(`/dashboard/workspaces?next=${encodeURIComponent(destination)}`);
  return { user, workspace: authorization.workspace };
}

export async function requireFashionPartner() {
  const auth = await requireWorkspace("fashion_partner");
  if (!auth.workspace?.resource_id) {
    const legacy = await requireApprovedDesigner("/dashboard/designer/brand");
    return { ...legacy, workspace: null };
  }
  const designer = await getDesignerForUserAndId(auth.user.id, auth.workspace.resource_id);
  if (!designer || designer.approval_status !== "approved") redirect("/dashboard/workspaces?next=%2Fdashboard%2Fdesigner%2Fbrand");
  return { ...auth, designer };
}

export async function requireBeautyPartner() {
  const auth = await requireWorkspace("beauty_partner");
  if (!auth.workspace?.resource_id) {
    const legacy = await requireApprovedDesigner("/dashboard/beauty");
    const destination = brandPartnerCenterPath(legacy.designer.brand_category);
    if (destination !== "/dashboard/beauty") redirect(destination);
    return { ...legacy, workspace: null };
  }
  const designer = await getDesignerForUserAndId(auth.user.id, auth.workspace.resource_id);
  if (!designer || designer.approval_status !== "approved") redirect("/dashboard/workspaces?next=%2Fdashboard%2Fbeauty");
  return { ...auth, designer };
}

export async function getSelectedPartnerForApi(request: Request) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, status: 401, error: "로그인이 만료되었습니다. 다시 로그인해주세요." };
  if (!hasDatabase()) return { ok: false as const, status: 503, error: "데이터베이스 연결이 필요합니다." };

  const workspaceType = parsePartnerWorkspaceType(request.headers.get("x-kmodu-workspace"));
  if (!workspaceType) return { ok: false as const, status: 400, error: "패션 또는 뷰티 작업공간을 확인해주세요." };
  const requestedMembershipId = request.headers.get("x-kmodu-membership")?.trim() || null;
  const membershipId = requestedMembershipId || (await cookies()).get(workspaceCookieName)?.value || null;
  if (!membershipId) return { ok: false as const, status: 403, error: "선택된 브랜드 작업공간이 없습니다." };

  const workspace = await resolveUserWorkspace({
    userId: user.id,
    workspaceType,
    membershipId,
    requireActive: true,
  });
  const authorization = authorizeWorkspace({ user, requestedType: workspaceType, membership: workspace });
  if (!authorization.ok) return { ok: false as const, status: 403, error: "이 브랜드 작업공간에 접근할 수 없습니다." };
  const resource = authorizePartnerResource({ workspaceType, workspaceResourceId: authorization.workspace.resource_id });
  if (!resource.ok) return { ok: false as const, status: resource.status, error: "브랜드 작업공간 소유권을 확인할 수 없습니다." };
  const designer = await getDesignerForUserAndId(user.id, resource.designerId);
  if (!designer || designer.approval_status !== "approved") return { ok: false as const, status: 403, error: "현재 이용할 수 없는 브랜드입니다." };
  return { ok: true as const, user, designer, workspace: authorization.workspace };
}

export async function getApprovedDesignerForApi() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "designer" && user.role !== "admin")) {
    return { ok: false as const, status: 401, error: "로그인이 만료되었습니다. 다시 로그인해주세요." };
  }

  const designer = await getDesignerForUser(user.id);
  if (user.role === "admin") {
    if (!designer) {
      return { ok: false as const, status: 403, error: "이 관리자 계정에 연결된 디자이너 프로필이 없습니다." };
    }
    return { ok: true as const, user, designer };
  }
  if (!designer || designer.approval_status === "disabled" || designer.approval_status === "rejected") {
    return { ok: false as const, status: 403, error: "사용 가능한 디자이너 계정이 필요합니다." };
  }

  return { ok: true as const, user, designer };
}

export async function requireApprovedCreator(): Promise<{ user: SessionUser; creator: CreatorAccount }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=creator_required");

  if (user.role === "admin") {
    const adminCreator = await getOrCreateAdminCreatorAccount(user.id, user.email);
    if (!adminCreator) redirect("/login?notice=creator_preview_unavailable");
    return { user, creator: adminCreator };
  }

  const creator = await getCreatorAccountForUser(user.id);
  if (!creator) redirect("/login?error=creator_required");
  if (creator.approval_status === "disabled") redirect("/login?error=creator_required");
  return { user, creator };
}

export async function getApprovedCreatorForApi() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, status: 401, error: "Creator authentication is required." };
  }

  const creator = user.role === "admin"
    ? await getOrCreateAdminCreatorAccount(user.id, user.email)
    : await getCreatorAccountForUser(user.id);
  if (!creator) {
    return { ok: false as const, status: 403, error: "Creator account is required." };
  }
  if (creator.approval_status === "disabled") {
    return { ok: false as const, status: 403, error: "An active creator account is required." };
  }
  return { ok: true as const, user, creator };
}

export async function requireAgencyUser(): Promise<SessionUser> {
  const user = await requireUser("agency");
  if (!await hasActiveAgencyGroupRelationship(user.id)) {
    redirect("/login?error=agency_group_required");
  }
  return user;
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === "test" || normalizedEmail === "admin") return null;

  const user = await getUserByEmail(normalizedEmail);
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return user;
}
