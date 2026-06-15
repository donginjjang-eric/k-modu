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

  // 정식 도메인이 아닌 곳(예: raw Railway URL k-modu-production.up.railway.app)에서 로그인을 시작하면
  // 그 도메인 콜백이 구글에 미등록이라 redirect_uri_mismatch가 난다. 로그인 흐름 전체(state 쿠키·redirect_uri·콜백)를
  // 정식 도메인으로 넘겨 항상 같은 도메인에서 일어나게 한다. (dev/localhost는 건드리지 않도록 production에서만)
  const canonical = (process.env.PUBLIC_BASE_URL || "https://www.k-modu.co.kr").replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production" && canonical && origin !== canonical) {
    const target = new URL(`${canonical}/api/auth/google`);
    const forwardNext = new URL(request.url).searchParams.get("next");
    if (forwardNext) target.searchParams.set("next", forwardNext);
    return Response.redirect(target.toString(), 302);
  }

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
