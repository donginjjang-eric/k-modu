// 구글 로그인 사용자의 뷰티 브랜드를 즉시 만들고 전용 작업공간을 선택합니다.
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getUserById, withDatabaseTransaction } from "@/lib/db";
import { createBeautySignup, validateBeautySignupInput } from "@/lib/beauty-signup";
import { listUserWorkspaces } from "@/lib/workspace-access";
import { workspaceCookieName } from "@/lib/workspace-selection";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: true, user: null, brands: [] }, { headers: { "Cache-Control": "no-store" } });
  const brands = (await listUserWorkspaces(user.id))
    .filter((item) => item.workspace_type === "beauty_partner")
    .map((item) => ({ membershipId: item.id, status: item.status }));
  return Response.json({ ok: true, user: { email: user.email, name: user.name || "" }, brands }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !(await getUserById(user.id))) return Response.json({ ok: false, error: "구글 로그인 후 가입해 주세요." }, { status: 401 });
  const validated = validateBeautySignupInput(await request.json().catch(() => null));
  if (!validated.ok) return Response.json({ ok: false, error: validated.error }, { status: 400 });
  try {
    const result = await withDatabaseTransaction((client) => createBeautySignup(client, user.id, validated.value));
    if (result.duplicate) return Response.json({ ok: false, error: "이미 등록한 브랜드입니다. 기존 뷰티 브랜드 센터를 이용해 주세요." }, { status: 409 });
    const cookieStore = await cookies();
    cookieStore.set(workspaceCookieName, result.membershipId, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return Response.json({ ok: true, redirectTo: "/dashboard/beauty/products" }, { status: 201 });
  } catch (error) {
    console.error("[beauty-signup] create failed:", error);
    return Response.json({ ok: false, error: "브랜드 등록에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
