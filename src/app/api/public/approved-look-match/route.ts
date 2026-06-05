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

  return Response.json({
    ok: true,
    exactMatch: Boolean(exact),
    look: exact ? {
      id: exact.id,
      designerId: exact.designer_id,
      imageUrl: exact.image_url,
      selectedProductIds: exact.selected_product_ids,
      createdAt: exact.created_at,
    } : null,
  });
}
