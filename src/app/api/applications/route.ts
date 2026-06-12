import { getCurrentUser } from "@/lib/auth";
import { createDesignerApplication, getDesignerForUser } from "@/lib/db";

function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  // 신청은 구글 로그인 후에만 가능 (화면 게이트와 동일한 규칙을 서버에서도 강제 — 스팸 차단)
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return Response.json({ ok: false, error: "로그인 후 신청할 수 있어요." }, { status: 401 });
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
}
