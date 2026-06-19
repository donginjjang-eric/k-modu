// 구글 로그인 콜백: state 검증 → 토큰 교환 → 사용자 조회/자동 등록 → 세션 발급
import { cookies } from "next/headers";
import { createSessionToken, sessionCookieName, sessionMaxAgeSeconds } from "@/lib/auth";
import { findOrCreateGoogleUser } from "@/lib/db";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  getRedirectUri,
  getRequestOrigin,
  oauthNextCookieName,
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
  const nextPath = cookieStore.get(oauthNextCookieName)?.value || "";
  cookieStore.delete(oauthNextCookieName);

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

    const { user, designer } = await findOrCreateGoogleUser(email);

    cookieStore.set(sessionCookieName, createSessionToken({
      ...user,
      name: profile.name?.trim() || undefined,
      avatar: profile.picture?.trim() || undefined,
    }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAgeSeconds,
    });

    // 로그인은 원래 보던 곳으로 돌아가는 게 기본. 입구(/admin, /studio, /apply)로 들어온 경우만 그 목적지로 보낸다.
    const dest = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "";
    // 로그인 성공 피드백(토스트)용 플래그
    const withWelcome = (path: string) => `${origin}${path}${path.includes("?") ? "&" : "?"}welcome=1`;

    if (user.role === "admin") {
      return Response.redirect(withWelcome(dest || "/"), 302);
    }
    if (designer?.approval_status === "approved") {
      return Response.redirect(withWelcome(dest || "/"), 302);
    }
    if (designer) {
      // 신청서는 있으나 아직 승인 전
      return Response.redirect(`${origin}/login?notice=approval_pending`, 302);
    }
    // 신청 내역이 없는 구글 계정: 신청 페이지로 가던 길이면 그대로, 아니면 신청 안내
    return Response.redirect(dest ? withWelcome(dest) : `${origin}/login?notice=apply_required`, 302);
  } catch (error) {
    console.error("[google-login] callback failed:", error);
    return Response.redirect(`${origin}/login?error=google_failed`, 302);
  }
}
