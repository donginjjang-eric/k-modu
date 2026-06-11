import { getApprovedDesigner, getApprovedGeneratedLooksForDesigner, getPublicProductsForDesigner } from "@/lib/db";

// Public (no-auth) read endpoint for the legacy styling board.
// Returns a designer + their products so designers.html can render the
// "보유 제품" list from the real database instead of hardcoded data.
export async function GET(request: Request) {
  const designerId = new URL(request.url).searchParams.get("designerId")?.trim() || "";
  if (!designerId) {
    return Response.json({ ok: false, error: "designerId is required." }, { status: 400 });
  }

  const designer = await getApprovedDesigner(designerId);
  if (!designer) {
    return Response.json({ ok: false, error: "Designer not found." }, { status: 404 });
  }

  const products = await getPublicProductsForDesigner(designer.id);
  const approvedLooks = await getApprovedGeneratedLooksForDesigner(designer.id, 12);

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
    // 스튜디오에서 승인된 AI 룩. 모달 스타일링 보드 탭의 "생성된 룩" 줄에 미리 채워진다.
    approvedLooks: approvedLooks.map((look) => ({
      id: look.id,
      image: look.image_url,
    })),
  });
}
