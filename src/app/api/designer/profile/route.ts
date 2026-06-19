import { getApprovedDesignerForApi } from "@/lib/auth";
import { updateDesignerProfile } from "@/lib/db";

export async function PATCH(request: Request) {
  // API라 redirect(HTML) 대신 JSON 401/403을 준다 — 세션 만료 시 클라이언트가 깨지지 않도록
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const body = await request.json().catch(() => ({}));

  try {
    const updated = await updateDesignerProfile(designer.id, {
      brand_name: body.brandName ? String(body.brandName).trim() : undefined,
      designer_name: body.designerName ? String(body.designerName).trim() : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      mood: body.mood !== undefined ? String(body.mood) : undefined,
      country: body.country !== undefined ? String(body.country) : undefined,
    });
    return Response.json({ ok: true, designer: updated });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update profile.",
    }, { status: 400 });
  }
}
