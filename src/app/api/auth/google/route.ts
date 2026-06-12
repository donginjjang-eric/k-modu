// 구글 로그인 시작: CSRF 방지용 state 쿠키를 심고 구글 동의 화면으로 리다이렉트
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import {
  buildGoogleAuthUrl,
  getRedirectUri,
  getRequestOrigin,
  isGoogleLoginConfigured,
  oauthNextCookieName,
  oauthStateCookieName,
} from "@/lib/google-oauth";

export async function GET(request: Request) {
  const origin = getRequestOrigin(request);
  if (!isGoogleLoginConfigured()) {
    return Response.redirect(`${origin}/login?error=google_not_configured`, 302);
  }

  const state = randomBytes(16).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(oauthStateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  // 로그인 후 복귀할 사이트 내 경로 (예: /apply). 외부 URL은 거부한다.
  const next = new URL(request.url).searchParams.get("next") || "";
  if (next.startsWith("/") && !next.startsWith("//")) {
    cookieStore.set(oauthNextCookieName, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
  }

  return Response.redirect(buildGoogleAuthUrl(getRedirectUri(request), state), 302);
}
