import { cookies } from "next/headers";
import { createSessionToken, loginUser, sessionCookieName, sessionMaxAgeSeconds } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return Response.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }

  const user = await loginUser(email, password);
  if (!user) {
    return Response.json({ ok: false, error: "Invalid login." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });

  // 로그인은 원래 보던 곳(기본: 메인)으로. 입구로 들어온 경우만 next 목적지로 보낸다.
  const next = String(body.next || "");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    redirectTo: safeNext || "/",
  });
}
