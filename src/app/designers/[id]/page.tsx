import { notFound } from "next/navigation";
import StylingBoard from "@/components/StylingBoard";
import { getDesigner, getModelTemplates, getProductsForDesigner } from "@/lib/db";

export default async function DesignerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const designer = await getDesigner(id);
  if (!designer) notFound();
  const [products, modelTemplates] = await Promise.all([
    getProductsForDesigner(designer.id),
    getModelTemplates(),
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
          heroImage: "/assets/generated-looks/maison-lune-kfashion-female-full-look.png",
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
    </main>
  );
}
