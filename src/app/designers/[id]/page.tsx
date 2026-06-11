import { notFound } from "next/navigation";
import StylingBoard from "@/components/StylingBoard";
import { getApprovedGeneratedLooksForDesigner, getApprovedPortfolioImagesForDesigner, getDesigner, getModelTemplates, getPublicProductsForDesigner } from "@/lib/db";
import { getDesignerDefaultModelImage } from "@/lib/designer-defaults";

export default async function DesignerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const designer = await getDesigner(id);
  if (!designer) notFound();
  const [products, modelTemplates, approvedLooks, portfolioImages] = await Promise.all([
    getPublicProductsForDesigner(designer.id),
    getModelTemplates(),
    getApprovedGeneratedLooksForDesigner(designer.id, 12),
    getApprovedPortfolioImagesForDesigner(designer.id),
  ]);

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="kicker">Designer Styling Board</p>
          <h1 style={{ margin: 0, fontSize: 48 }}>{designer.brand_name}</h1>
          <p className="lead">{designer.description}</p>
        </div>
      </div>
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
        modelTemplates={modelTemplates.map((template) => ({
          id: template.id,
          label: template.name,
          image: template.image_url,
        }))}
      />

      {portfolioImages.length ? (
        <section style={{ marginTop: 56 }}>
          <div className="section-head">
            <div>
              <p className="kicker">Portfolio</p>
              <h2 style={{ margin: 0, fontSize: 36 }}>브랜드 프로필 / 포트폴리오</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {portfolioImages.map((image) => (
              <article
                key={image.id}
                style={{
                  aspectRatio: "3 / 4",
                  border: "1px solid rgba(0,0,0,.12)",
                  background: `#f4f1ea url('${image.image_url}') center top / cover no-repeat`,
                }}
                aria-label={image.title || `${designer.brand_name} portfolio image`}
                title={image.title || undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {approvedLooks.length ? (
        <section style={{ marginTop: 56 }}>
          <div className="section-head">
            <div>
              <p className="kicker">Approved AI Looks</p>
              <h2 style={{ margin: 0, fontSize: 36 }}>공개 승인된 AI 룩</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {approvedLooks.map((look) => (
              <article
                key={look.id}
                style={{
                  aspectRatio: "3 / 4",
                  border: "1px solid rgba(0,0,0,.12)",
                  background: `#f4f1ea url('${look.image_url}') center top / cover no-repeat`,
                }}
                aria-label={`${designer.brand_name} approved AI look`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
