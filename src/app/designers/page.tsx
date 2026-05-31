import Link from "next/link";
import { designer, products } from "@/lib/phase1-data";

export default function DesignersPage() {
  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="kicker">Designer Board</p>
          <h1 style={{ margin: 0, fontSize: 54 }}>{designer.brandName}</h1>
        </div>
        <Link className="pill" href={`/designers/${designer.id}`}>Full Look Preview</Link>
      </div>
      <section className="designer-grid">
        <article className="designer-card">
          <img src={designer.heroImage} alt={`${designer.brandName} preview`} />
          <div className="designer-card-body">
            <p className="kicker">{designer.country}</p>
            <h2>{designer.brandName}</h2>
            <p className="notice">{designer.description}</p>
          </div>
        </article>
        {products.slice(0, 4).map((product) => (
          <article className="designer-card" key={product.id}>
            <img src={product.image} alt={product.name} />
            <div className="designer-card-body">
              <p className="kicker">{product.category}</p>
              <h2>{product.name}</h2>
              <p className="notice">{product.status}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
