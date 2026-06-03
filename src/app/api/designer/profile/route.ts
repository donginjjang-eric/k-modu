import { requireApprovedDesigner } from "@/lib/auth";
import { updateDesignerProfile } from "@/lib/db";

export async function PATCH(request: Request) {
  const { designer } = await requireApprovedDesigner();
  const body = await request.json().catch(() => ({}));

  try {
    const updated = await updateDesignerProfile(designer.id, {
      brand_name: body.brandName ? String(body.brandName).trim() : undefined,
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
