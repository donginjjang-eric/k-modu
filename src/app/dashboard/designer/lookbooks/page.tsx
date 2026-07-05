// 룩북 만들기: 승인된 룩·포트폴리오·공개 상품을 골라 공개 링크 룩북으로 묶는 화면
import { requireApprovedDesigner } from "@/lib/auth";
import {
  getApprovedGeneratedLooksForDesigner,
  getApprovedPortfolioImagesForDesigner,
  getLookbooksForDesigner,
  getProductsForDesigner,
} from "@/lib/db";
import LookbookManager from "@/components/LookbookManager";

export default async function DesignerLookbooksPage() {
  const { designer } = await requireApprovedDesigner();
  const [looks, portfolioImages, products, lookbooks] = await Promise.all([
    getApprovedGeneratedLooksForDesigner(designer.id, 60),
    getApprovedPortfolioImagesForDesigner(designer.id),
    getProductsForDesigner(designer.id),
    getLookbooksForDesigner(designer.id),
  ]);

  return (
    <LookbookManager
      brandName={designer.brand_name}
      assets={{
        looks: looks.map((look) => ({
          id: look.id,
          imageUrl: look.image_url,
          videoUrl: look.video_status === "completed" ? look.video_url : null,
        })),
        portfolio: portfolioImages.map((image) => ({
          id: image.id,
          imageUrl: image.image_url,
          title: image.title || "",
        })),
        products: products
          .filter((product) => product.status === "active")
          .map((product) => ({ id: product.id, imageUrl: product.image_url, name: product.name })),
      }}
      initialLookbooks={lookbooks}
      hasIntro={Boolean(designer.description || designer.mood)}
    />
  );
}
