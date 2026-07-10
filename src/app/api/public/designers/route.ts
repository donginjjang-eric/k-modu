// 공개 디자이너 보드용: 승인된 디자이너 목록과 각자의 승인 포트폴리오 이미지를 반환하는 공개 API
import type { DesignerPortfolioImage } from "@/lib/types";
import {
  getApprovedPortfolioImagesForDesigners,
  getPublicDesignerCounts,
  getPublicDesigners,
} from "@/lib/db";

export async function GET() {
  const designers = await getPublicDesigners();
  const designerIds = designers.map((designer) => designer.id);
  const [images, counts] = await Promise.all([
    getApprovedPortfolioImagesForDesigners(designerIds),
    getPublicDesignerCounts(designerIds),
  ]);

  const imagesByDesigner = new Map<string, DesignerPortfolioImage[]>();
  for (const image of images) {
    const list = imagesByDesigner.get(image.designer_id) || [];
    list.push(image);
    imagesByDesigner.set(image.designer_id, list);
  }

  return Response.json({
    ok: true,
    counts,
    designers: designers.map((designer) => ({
      id: designer.id,
      brandName: designer.brand_name,
      designerName: designer.designer_name,
      description: designer.description,
      mood: designer.mood,
      country: designer.country,
      logo: designer.logo_url,
      images: (imagesByDesigner.get(designer.id) || []).map((image) => ({
        id: image.id,
        title: image.title,
        kind: image.kind,
        image: image.image_url,
      })),
    })),
  });
}
