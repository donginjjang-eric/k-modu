import { getSelectedPartnerForApi } from "@/lib/auth";
import { getProductForDesigner, updateProductForDesigner } from "@/lib/db";
import { normalizeProductImages } from "@/lib/product-images";
import { normalizeProductDetailImages } from "@/lib/product-detail-images";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSelectedPartnerForApi(request);
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const { id } = await params;
  const product = await getProductForDesigner(designer.id, id);
  if (!product) return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  return Response.json({ ok: true, product });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSelectedPartnerForApi(request);
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const current = await getProductForDesigner(designer.id, id);
  if (current?.approval_status === "disabled") {
    return Response.json({ ok: false, error: "관리자가 비공개 처리한 상품입니다. 문의 후 다시 이용해 주세요." }, { status: 403 });
  }
  const hasImageUrls = Object.hasOwn(body, "imageUrls") || Object.hasOwn(body, "image_urls");
  const imageUrls = hasImageUrls ? normalizeProductImages(body.imageUrls ?? body.image_urls, body.imageUrl || "") : undefined;
  const hasDetailImageUrls = Object.hasOwn(body, "detailImageUrls") || Object.hasOwn(body, "detail_image_urls");
  const detailImageUrls = hasDetailImageUrls ? normalizeProductDetailImages(body.detailImageUrls ?? body.detail_image_urls) : undefined;

  const product = await updateProductForDesigner(designer.id, id, {
    name: body.name ? String(body.name).trim() : undefined,
    category: body.category ? String(body.category).trim() : undefined,
    price: body.price ? String(body.price) : undefined,
    supplyPrice: (body.supplyPrice ?? body.supply_price) ? String(body.supplyPrice ?? body.supply_price) : undefined,
    color: body.color ? String(body.color) : undefined,
    description: body.description ? String(body.description) : undefined,
    imageUrl: imageUrls?.[0] || (body.imageUrl ? String(body.imageUrl) : undefined),
    imageUrls,
    detailImageUrls,
    tryonImageUrl: body.tryonImageUrl ? String(body.tryonImageUrl) : undefined,
    imageHash: body.imageHash ? String(body.imageHash) : undefined,
    mood: body.mood ? String(body.mood) : undefined,
    status: ["draft", "active", "hidden"].includes(body.status) ? body.status : undefined,
  });

  if (!product) return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  return Response.json({ ok: true, product });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSelectedPartnerForApi(request);
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const { id } = await params;
  const current = await getProductForDesigner(designer.id, id);
  if (current?.approval_status === "disabled") {
    return Response.json({ ok: false, error: "관리자가 비공개 처리한 상품은 삭제할 수 없습니다." }, { status: 403 });
  }
  const product = await updateProductForDesigner(designer.id, id, { status: "hidden" });
  if (!product) return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  return Response.json({ ok: true, product });
}
