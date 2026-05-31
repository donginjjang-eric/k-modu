import { requireApprovedDesigner } from "@/lib/auth";
import { createProductForDesigner, getProductsForDesigner } from "@/lib/db";

export async function GET() {
  const { designer } = await requireApprovedDesigner();
  const products = await getProductsForDesigner(designer.id);
  return Response.json({ ok: true, products });
}

export async function POST(request: Request) {
  const { designer } = await requireApprovedDesigner();
  const body = await request.json().catch(() => ({}));

  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const imageUrl = String(body.imageUrl || body.image_url || "").trim();
  if (!name || !category || !imageUrl) {
    return Response.json({ ok: false, error: "name, category, and imageUrl are required." }, { status: 400 });
  }

  try {
    const product = await createProductForDesigner({
      designerId: designer.id,
      name,
      category,
      price: body.price ? String(body.price) : null,
      color: body.color ? String(body.color) : null,
      description: body.description ? String(body.description) : null,
      imageUrl,
      tryonImageUrl: body.tryonImageUrl ? String(body.tryonImageUrl) : null,
      imageHash: body.imageHash ? String(body.imageHash) : null,
      mood: body.mood ? String(body.mood) : null,
      status: body.status === "draft" || body.status === "hidden" ? body.status : "active",
    });
    return Response.json({ ok: true, product });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create product.",
    }, { status: 400 });
  }
}
