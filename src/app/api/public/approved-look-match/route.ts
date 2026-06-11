import { getApprovedGeneratedLooksForDesigner } from "@/lib/db";

const DEFAULT_PUBLIC_DESIGNER_ID = "maison-lune-seoul";
const DEMO_PRODUCT_IDS = new Set([
  "top-ivory-lace-bow",
  "skirt-brown-polka-bubble",
  "bag-black-glossy-shoulder",
  "shoes-black-cork-wedge-sandals",
]);
const DEMO_LOOK_IMAGE = "/assets/generated-looks/maison-lune-fixed-female-full-look.png";

function sameProductSet(left: unknown, right: string[]) {
  const ids = Array.isArray(left) ? left.map(String).sort() : [];
  const target = right.map(String).sort();
  return ids.length === target.length && ids.every((id, index) => id === target[index]);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const designerId = String(body.designerId || "").trim();
  const productIds: string[] = Array.isArray(body.productIds) ? body.productIds.map(String).filter(Boolean) : [];

  if (!designerId) {
    return Response.json({ ok: false, error: "designerId is required." }, { status: 400 });
  }

  const looks = await getApprovedGeneratedLooksForDesigner(designerId, 40);
  const exact = looks.find((look) => sameProductSet(look.selected_product_ids, productIds));
  const canUseDemoLook = designerId === DEFAULT_PUBLIC_DESIGNER_ID
    && productIds.length >= 1
    && productIds.every((id) => DEMO_PRODUCT_IDS.has(id));

  if (!exact && canUseDemoLook) {
    return Response.json({
      ok: true,
      exactMatch: true,
      look: {
        id: "demo-maison-lune-public-look",
        designerId,
        imageUrl: DEMO_LOOK_IMAGE,
        selectedProductIds: productIds,
        createdAt: new Date().toISOString(),
      },
    });
  }

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
