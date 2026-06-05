import { requireApprovedDesigner } from "@/lib/auth";
import { getProductsForDesigner, getModelTemplates, getGeneratedLooksForDesigner } from "@/lib/db";
import StylingBoard from "@/components/StylingBoard";

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
          heroImage: products[0]?.image_url || "/assets/mainmodel_2.png",
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

      {looks.length ? (
        <>
          <div className="st-sec-head" style={{ marginTop: 32 }}><h2>내가 만든 룩</h2></div>
          <div className="st-rail">
            {looks.map((look) => (
              <div key={look.id} className="thumb" style={{ backgroundImage: `url('${look.image_url}')` }} />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
