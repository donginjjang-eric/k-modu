import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDesignerForUser, getUserByEmail } from "./db";
import type { Role, User } from "./types";

export const sessionCookieName = "kmodu_session";
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

type SessionUser = Pick<User, "id" | "email" | "role"> & { exp: number };

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

export function createSessionToken(user: Pick<User, "id" | "email" | "role">) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
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
  return parseSessionToken(cookieStore.get(sessionCookieName)?.value);
}

// 입구별 로그인 후 복귀 목적지. 로그인 자체는 메인으로 돌아가고, 입구로 들어온 경우만 그 목적지로 보낸다.
function loginEntryUrl(role: Role) {
  const next = role === "admin" ? "/dashboard/admin" : "/dashboard/designer/brand";
  return `/login?notice=${role}_login&next=${encodeURIComponent(next)}`;
}

export async function requireUser(role?: Role) {
  const user = await getCurrentUser();
  // 비로그인: 어떤 입구(관리자/디자이너)로 들어왔는지 알리고, 로그인 후 그 입구의 목적지로 복귀시킨다.
  if (!user) redirect(role ? loginEntryUrl(role) : "/login");
  // 로그인은 했지만 권한이 다른 경우: 어떤 계정이 필요한지 로그인 페이지에서 안내한다.
  if (role && user.role !== role) redirect(`/login?error=${role}_required`);
  return user;
}

// 관리자는 모든 영역에 입장 가능. 스튜디오는 계정에 연결된 디자이너 프로필로 동작한다.
export async function requireApprovedDesigner() {
  const user = await getCurrentUser();
  if (!user) redirect(loginEntryUrl("designer"));
  if (user.role !== "designer" && user.role !== "admin") redirect("/login?error=designer_required");

  const designer = await getDesignerForUser(user.id);
  if (user.role === "admin") {
    // 관리자인데 연결된 디자이너 프로필이 없으면, 조용히 튕기지 말고 이유와 다음 행동을 안내한다.
    if (!designer) redirect("/login?notice=studio_profile_required");
    return { user, designer };
  }
  if (!designer || designer.approval_status !== "approved") redirect("/login?error=approval_required");
  return { user, designer };
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
  if (!designer || designer.approval_status !== "approved") {
    return { ok: false as const, status: 403, error: "승인된 디자이너 계정만 사용할 수 있습니다." };
  }

  return { ok: true as const, user, designer };
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === "test" || normalizedEmail === "admin") return null;

  const user = await getUserByEmail(normalizedEmail);
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return user;
}
