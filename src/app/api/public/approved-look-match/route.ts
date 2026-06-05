import { getApprovedGeneratedLooksForDesigner } from "@/lib/db";

function sameProductSet(left: unknown, right: string[]) {
  const ids = Array.isArray(left) ? left.map(String).sort() : [];
  const target = right.map(String).sort();
  return ids.length === target.length && ids.every((id, index) => id === target[index]);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const designerId = String(body.designerId || "").trim();
  const productIds = Array.isArray(body.productIds) ? body.productIds.map(String).filter(Boolean) : [];

  if (!designerId) {
    return Response.json({ ok: false, error: "designerId is required." }, { status: 400 });
  }

  const looks = await getApprovedGeneratedLooksForDesigner(designerId, 40);
  const exact = looks.find((look) => sameProductSet(look.selected_product_ids, productIds));
  const look = exact || looks[0] || null;

  return Response.json({
    ok: true,
    exactMatch: Boolean(exact),
    look: look ? {
      id: look.id,
      designerId: look.designer_id,
      imageUrl: look.image_url,
      selectedProductIds: look.selected_product_ids,
      createdAt: look.created_at,
    } : null,
  });
}
