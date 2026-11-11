import { getSelectedPartnerForApi } from "@/lib/auth";
import { createProductForDesigner, getProductsForDesigner } from "@/lib/db";
import { normalizeProductImages } from "@/lib/product-images";
import { normalizeProductDetailImages } from "@/lib/product-detail-images";

export async function GET(request: Request) {
  const auth = await getSelectedPartnerForApi(request);
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const products = await getProductsForDesigner(designer.id);
  return Response.json({ ok: true, products });
}

export async function POST(request: Request) {
  const auth = await getSelectedPartnerForApi(request);
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const body = await request.json().catch(() => ({}));

  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const imageUrls = normalizeProductImages(body.imageUrls ?? body.image_urls, String(body.imageUrl || body.image_url || ""));
  const imageUrl = imageUrls[0] || "";
  const detailImageUrls = normalizeProductDetailImages(body.detailImageUrls ?? body.detail_image_urls);
  if (!name || !category || !imageUrl) {
    return Response.json({ ok: false, error: "name, category, and imageUrl are required." }, { status: 400 });
  }

  try {
    const product = await createProductForDesigner({
      designerId: designer.id,
      name,
      category,
      price: body.price ? String(body.price) : null,
      supplyPrice: body.supplyPrice ?? body.supply_price ? String(body.supplyPrice ?? body.supply_price) : null,
      color: body.color ? String(body.color) : null,
      description: body.description ? String(body.description) : null,
      imageUrl,
      imageUrls,
      detailImageUrls,
      tryonImageUrl: body.tryonImageUrl ? String(body.tryonImageUrl) : null,
      imageHash: body.imageHash ? String(body.imageHash) : null,
      mood: body.mood ? String(body.mood) : null,
      status: body.status === "draft" || body.status === "hidden" ? body.status : "active",
      approvalStatus: auth.workspace.workspace_type === "beauty_partner" ? "approved" : undefined,
    });
    return Response.json({ ok: true, product });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create product.",
    }, { status: 400 });
  }
}
