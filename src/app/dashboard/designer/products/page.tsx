import { products } from "@/lib/phase1-data";

export default function DesignerProductsPage() {
  return (
    <main className="page">
      <p className="kicker">Products</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>상품 목록</h1>
      <section className="designer-grid">
        {products.map((product) => (
          <article className="designer-card" key={product.id}>
            <img src={product.image} alt={product.name} />
            <div className="designer-card-body">
              <p className="kicker">{product.category}</p>
              <h2>{product.name}</h2>
              <p className="notice">Phase 4에서 DB 상품으로 교체됩니다.</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
