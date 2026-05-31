import { getProductsForDesigner, getPublicDesigners } from "@/lib/db";

export default async function DesignerProductsPage() {
  const [designer] = await getPublicDesigners();
  const products = designer ? await getProductsForDesigner(designer.id) : [];

  return (
    <main className="page">
      <p className="kicker">Products</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>상품 목록</h1>
      <section className="designer-grid">
        {products.map((product) => (
          <article className="designer-card" key={product.id}>
            <img src={product.image_url} alt={product.name} />
            <div className="designer-card-body">
              <p className="kicker">{product.category}</p>
              <h2>{product.name}</h2>
              <p className="notice">{product.description || "Phase 4에서 등록/수정 기능이 연결됩니다."}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
