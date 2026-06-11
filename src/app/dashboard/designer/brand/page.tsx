import { requireApprovedDesigner } from "@/lib/auth";
import BrandForm from "@/components/BrandForm";
import PortfolioManager from "@/components/PortfolioManager";
import { getPortfolioImagesForDesigner } from "@/lib/db";

export default async function DesignerBrandPage() {
  const { designer } = await requireApprovedDesigner();
  const portfolioImages = await getPortfolioImagesForDesigner(designer.id);

  return (
    <>
      <h1 className="st-title">🏷 내 브랜드</h1>
      <p className="st-sub">공개 페이지에 보이는 브랜드 정보예요.</p>
      <BrandForm
        brandName={designer.brand_name}
        description={designer.description || ""}
        mood={designer.mood || ""}
      />
      <PortfolioManager initialImages={portfolioImages} />
    </>
  );
}
