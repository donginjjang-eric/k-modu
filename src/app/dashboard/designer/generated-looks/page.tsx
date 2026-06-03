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
      <h1 className="st-title">✨ AI 룩 만들기</h1>
      <p className="st-sub">모델과 상품을 골라 모델 착장 이미지를 만들어요.</p>

      <StylingBoard
        designer={{
          brandName: designer.brand_name,
          mood: designer.mood,
          heroImage: products[0]?.image_url || "/assets/mainmodel_2.png",
        }}
        products={products.map((p) => ({ id: p.id, name: p.name, category: p.category, status: p.status, image: p.image_url }))}
        modelTemplates={templates.map((t) => ({ id: t.id, label: t.name, image: t.image_url }))}
      />

      {looks.length ? (
        <>
          <div className="st-sec-head" style={{ marginTop: 32 }}><h2>내가 만든 룩</h2></div>
          <div className="st-rail">
            {looks.map((l) => (
              <div key={l.id} className="thumb" style={{ backgroundImage: `url('${l.image_url}')` }} />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
