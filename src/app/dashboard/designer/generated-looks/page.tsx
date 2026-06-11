import { requireApprovedDesigner } from "@/lib/auth";
import { getProductsForDesigner, getModelTemplates, getGeneratedLooksForDesigner } from "@/lib/db";
import { getDesignerDefaultModelImage } from "@/lib/designer-defaults";
import StylingBoard from "@/components/StylingBoard";
import DesignerGeneratedLooks from "@/components/DesignerGeneratedLooks";

export default async function DesignerAiLookPage() {
  const { designer } = await requireApprovedDesigner();
  const [products, templates, looks] = await Promise.all([
    getProductsForDesigner(designer.id),
    getModelTemplates(),
    getGeneratedLooksForDesigner(designer.id),
  ]);

  return (
    <>
      <h1 className="st-title">AI 룩 만들기</h1>
      <p className="st-sub">모델과 상품을 골라 AI 착장 이미지를 생성합니다.</p>

      <StylingBoard
        designer={{
          brandName: designer.brand_name,
          mood: designer.mood,
          heroImage: getDesignerDefaultModelImage(designer.id),
        }}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          status: product.status,
          image: product.image_url,
        }))}
        modelTemplates={templates.map((template) => ({
          id: template.id,
          label: template.name,
          image: template.image_url,
        }))}
      />

      <DesignerGeneratedLooks initialLooks={looks} />
    </>
  );
}
