import { cookies } from "next/headers";
import { sessionCookieName } from "@/lib/auth";
import { oauthNextCookieName, oauthStateCookieName } from "@/lib/google-oauth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  cookieStore.delete(oauthStateCookieName);
  cookieStore.delete(oauthNextCookieName);
  return new Response(null, { status: 303, headers: { Location: "/api/auth/google" } });
}
