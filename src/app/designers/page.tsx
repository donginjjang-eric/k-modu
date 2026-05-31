import Link from "next/link";
import { getProductsForDesigner, getPublicDesigners } from "@/lib/db";

export default async function DesignersPage() {
  const designers = await getPublicDesigners();
  const primaryDesigner = designers[0];
  const products = primaryDesigner ? await getProductsForDesigner(primaryDesigner.id) : [];

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="kicker">Designer Board</p>
          <h1 style={{ margin: 0, fontSize: 54 }}>{primaryDesigner?.brand_name || "K-MODU Designers"}</h1>
        </div>
        {primaryDesigner ? <Link className="pill" href={`/designers/${primaryDesigner.id}`}>Full Look Preview</Link> : null}
      </div>
      <section className="designer-grid">
        {designers.map((designer) => (
          <article className="designer-card" key={designer.id}>
            <img src="/assets/generated-looks/maison-lune-kfashion-female-full-look.png" alt={`${designer.brand_name} preview`} />
            <div className="designer-card-body">
              <p className="kicker">{designer.country}</p>
              <h2>{designer.brand_name}</h2>
              <p className="notice">{designer.description}</p>
            </div>
          </article>
        ))}
        {products.slice(0, 4).map((product) => (
          <article className="designer-card" key={product.id}>
            <img src={product.image_url} alt={product.name} />
            <div className="designer-card-body">
              <p className="kicker">{product.category}</p>
              <h2>{product.name}</h2>
              <p className="notice">{product.description || product.status}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
