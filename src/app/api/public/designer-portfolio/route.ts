import { getApprovedPortfolioImagesForDesigner, getDesigner } from "@/lib/db";

export async function GET(request: Request) {
  const designerId = new URL(request.url).searchParams.get("designerId")?.trim() || "";
  if (!designerId) {
    return Response.json({ ok: false, error: "designerId is required." }, { status: 400 });
  }

  const designer = await getDesigner(designerId);
  if (!designer) {
    return Response.json({ ok: false, error: "Designer not found." }, { status: 404 });
  }

  const images = await getApprovedPortfolioImagesForDesigner(designer.id);

  return Response.json({
    ok: true,
    designer: {
      id: designer.id,
      brandName: designer.brand_name,
    },
    images: images.map((image) => ({
      id: image.id,
      title: image.title,
      kind: image.kind,
      image: image.image_url,
      status: image.status,
    })),
  });
}
