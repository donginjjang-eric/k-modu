import { getCurrentUser } from "@/lib/auth";
import { createDesignerApplication, getDesignerForUser, getUserById } from "@/lib/db";

function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  // 신청은 구글 로그인 후에만 가능 (화면 게이트와 동일한 규칙을 서버에서도 강제 — 스팸 차단)
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return Response.json({ ok: false, error: "로그인 후 신청할 수 있어요." }, { status: 401 });
  }
  // 세션은 무상태(쿠키)라 계정이 삭제돼도 토큰이 남는다 — 실제 유저가 없으면 신청 연결 시 FK 오류가 나므로 막는다
  const accountUser = await getUserById(sessionUser.id);
  if (!accountUser) {
    return Response.json({ ok: false, error: "로그인이 만료됐어요. 로그아웃 후 다시 로그인해 신청해주세요." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "Invalid application payload." }, { status: 400 });
  }

  const brandName = requiredText((body as { brand?: unknown }).brand);
  const designerName = requiredText((body as { designer?: unknown }).designer);
  const email = requiredText((body as { email?: unknown }).email).toLowerCase();
  const phone = requiredText((body as { phone?: unknown }).phone);
  const headline = requiredText((body as { headline?: unknown }).headline);
  const category = requiredText((body as { category?: unknown }).category);

  if (!brandName || !designerName || !email || !phone) {
    return Response.json({ ok: false, error: "Brand, designer, email, and phone are required." }, { status: 400 });
  }

  // 로그인 계정에 아직 디자이너 프로필이 없으면 신청서를 그 계정에 바로 연결한다 (관리자도 디자이너가 될 수 있다).
  let linkUserId: string | undefined;
  if (sessionUser.role === "designer" || sessionUser.role === "admin") {
    const existing = await getDesignerForUser(sessionUser.id).catch(() => null);
    if (!existing) linkUserId = sessionUser.id;
  }

  try {
    const designer = await createDesignerApplication({
      brand_name: brandName,
      designer_name: designerName,
      contact_email: email,
      contact_phone: phone,
      description: headline,
      mood: category,
      country: "South Korea",
      user_id: linkUserId,
    });
    return Response.json({ ok: true, designer });
  } catch (error) {
    console.error("[applications] create failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "신청 접수 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
