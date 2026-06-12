// 구글 로그인 콜백: state 검증 → 토큰 교환 → 사용자 조회/자동 등록 → 세션 발급
import { cookies } from "next/headers";
import { createSessionToken, sessionCookieName, sessionMaxAgeSeconds } from "@/lib/auth";
import { findOrCreateGoogleUser } from "@/lib/db";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  getRedirectUri,
  getRequestOrigin,
  oauthStateCookieName,
} from "@/lib/google-oauth";

export async function GET(request: Request) {
  const origin = getRequestOrigin(request);
  const url = new URL(request.url);
  const cookieStore = await cookies();

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = cookieStore.get(oauthStateCookieName)?.value;
  cookieStore.delete(oauthStateCookieName);

  if (!code || !state || !expectedState || state !== expectedState) {
    console.error("[google-login] state check failed:", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasCookie: Boolean(expectedState),
    });
    return Response.redirect(`${origin}/login?error=google_failed`, 302);
  }

  try {
    const tokens = await exchangeGoogleCode(code, getRedirectUri(request));
    if (!tokens.access_token) {
      return Response.redirect(`${origin}/login?error=google_failed`, 302);
    }

    const profile = await fetchGoogleProfile(tokens.access_token);
    const email = String(profile.email || "").trim().toLowerCase();
    if (!email || profile.email_verified === false) {
      return Response.redirect(`${origin}/login?error=google_failed`, 302);
    }

    const { user, designer } = await findOrCreateGoogleUser(email, String(profile.name || "").trim());

    cookieStore.set(sessionCookieName, createSessionToken(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAgeSeconds,
    });

    if (user.role === "admin") {
      return Response.redirect(`${origin}/dashboard/admin`, 302);
    }
    if (designer?.approval_status === "approved") {
      return Response.redirect(`${origin}/dashboard/designer/brand`, 302);
    }
    // 신규 가입 또는 승인 대기 중인 디자이너는 안내 메시지와 함께 로그인 페이지로
    return Response.redirect(`${origin}/login?notice=approval_pending`, 302);
  } catch (error) {
    console.error("[google-login] callback failed:", error);
    return Response.redirect(`${origin}/login?error=google_failed`, 302);
  }
}
