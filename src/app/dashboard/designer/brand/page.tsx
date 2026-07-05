// 브랜드 프로필: 편집(기본 정보·대표 사진·포트폴리오)과 공개 카드 미리보기를 한 화면에서
import { requireApprovedDesigner } from "@/lib/auth";
import { getGeneratedLooksForDesigner, getPortfolioImagesForDesigner } from "@/lib/db";
import BrandProfileStudio from "@/components/BrandProfileStudio";

export default async function DesignerBrandPage() {
  const { designer } = await requireApprovedDesigner();
  const [portfolioImages, looks] = await Promise.all([
    getPortfolioImagesForDesigner(designer.id),
    getGeneratedLooksForDesigner(designer.id),
  ]);

  return (
    <BrandProfileStudio
      designer={{
        id: designer.id,
        brandName: designer.brand_name,
        designerName: designer.designer_name || "",
        description: designer.description || "",
        mood: designer.mood || "",
      }}
      initialImages={portfolioImages}
      looksCount={looks.length}
    />
  );
}
