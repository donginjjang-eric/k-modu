import { getDesigner, getProductsForDesigner } from "@/lib/db";

// Public (no-auth) read endpoint for the legacy styling board.
// Returns a designer + their products so designers.html can render the
// "보유 제품" list from the real database instead of hardcoded data.
export async function GET(request: Request) {
  const designerId = new URL(request.url).searchParams.get("designerId")?.trim() || "";
  if (!designerId) {
    return Response.json({ ok: false, error: "designerId is required." }, { status: 400 });
  }

  const designer = await getDesigner(designerId);
  if (!designer) {
    return Response.json({ ok: false, error: "Designer not found." }, { status: 404 });
  }

  const products = await getProductsForDesigner(designer.id);

  return Response.json({
    ok: true,
    designer: {
      id: designer.id,
      brandName: designer.brand_name,
      mood: designer.mood,
      description: designer.description,
    },
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      image: product.image_url,
      status: "보유",
    })),
  });
}
