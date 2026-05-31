import { notFound } from "next/navigation";
import { designer, modelTemplates, products } from "@/lib/phase1-data";
import StylingBoard from "@/components/StylingBoard";

export default async function DesignerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== designer.id) notFound();

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="kicker">Designer Styling Board</p>
          <h1 style={{ margin: 0, fontSize: 48 }}>{designer.brandName}</h1>
          <p className="lead">{designer.description}</p>
        </div>
      </div>
      <StylingBoard designer={designer} products={products} modelTemplates={modelTemplates} />
    </main>
  );
}
