// 구글 OAuth 로그인: 인증 URL 생성, 코드→토큰 교환, 프로필 조회를 담당하는 헬퍼
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

export const oauthStateCookieName = "kmodu_oauth_state";
export const oauthNextCookieName = "kmodu_oauth_next";

export function isGoogleLoginConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// 프록시(Railway) 뒤에서도 올바른 외부 주소를 얻기 위해 forwarded 헤더를 우선 사용한다.
export function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export function getRedirectUri(request: Request) {
  return `${getRequestOrigin(request)}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google token exchange failed: ${response.status} ${body.slice(0, 300)}`);
  }
  return (await response.json()) as { access_token?: string };
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google userinfo failed: ${response.status}`);
  }
  return (await response.json()) as { email?: string; email_verified?: boolean; name?: string };
}
