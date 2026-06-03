import { requireApprovedDesigner } from "@/lib/auth";
import { getProductForDesigner, updateProductForDesigner } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { designer } = await requireApprovedDesigner();
  const { id } = await params;
  const product = await getProductForDesigner(designer.id, id);
  if (!product) return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  return Response.json({ ok: true, product });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { designer } = await requireApprovedDesigner();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const product = await updateProductForDesigner(designer.id, id, {
    name: body.name ? String(body.name).trim() : undefined,
    category: body.category ? String(body.category).trim() : undefined,
    price: body.price ? String(body.price) : undefined,
    supplyPrice: (body.supplyPrice ?? body.supply_price) ? String(body.supplyPrice ?? body.supply_price) : undefined,
    color: body.color ? String(body.color) : undefined,
    description: body.description ? String(body.description) : undefined,
    imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
    tryonImageUrl: body.tryonImageUrl ? String(body.tryonImageUrl) : undefined,
    imageHash: body.imageHash ? String(body.imageHash) : undefined,
    mood: body.mood ? String(body.mood) : undefined,
    status: ["draft", "active", "hidden"].includes(body.status) ? body.status : undefined,
  });

  if (!product) return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  return Response.json({ ok: true, product });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { designer } = await requireApprovedDesigner();
  const { id } = await params;
  const product = await updateProductForDesigner(designer.id, id, { status: "hidden" });
  if (!product) return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  return Response.json({ ok: true, product });
}
