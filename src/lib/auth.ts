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

export async function requireUser(role?: Role) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect("/login");
  return user;
}

export async function requireApprovedDesigner() {
  const user = await requireUser("designer");
  const designer = await getDesignerForUser(user.id);
  if (!designer || designer.approval_status !== "approved") redirect("/login?error=approval_required");
  return { user, designer };
}

export async function getApprovedDesignerForApi() {
  const user = await getCurrentUser();
  if (!user || user.role !== "designer") {
    return { ok: false as const, status: 401, error: "로그인이 만료되었습니다. 다시 로그인해주세요." };
  }

  const designer = await getDesignerForUser(user.id);
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
