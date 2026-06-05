import { getApprovedGeneratedLooksForPublic } from "@/lib/db";

export async function GET(request: Request) {
  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam || 12), 1), 24);
  const looks = await getApprovedGeneratedLooksForPublic(Number.isFinite(limit) ? limit : 12);

  return Response.json({
    ok: true,
    looks: looks.map((look) => ({
      id: look.id,
      designerId: look.designer_id,
      designerName: look.designer_brand_name,
      imageUrl: look.image_url,
      createdAt: look.created_at,
    })),
  });
}
