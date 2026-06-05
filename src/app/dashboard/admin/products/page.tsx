import AdminProductActions from "@/components/AdminProductActions";
import { getProductsForAdmin } from "@/lib/db";

export default async function AdminProductsPage() {
  const products = await getProductsForAdmin();

  return (
    <>
      <h1 className="st-title">상품 전체 관리</h1>
      <p className="st-sub">디자이너가 올린 상품을 브랜드별로 확인하고 공개 상태를 조정합니다.</p>

      {products.length ? (
        <div className="admin-gallery admin-products">
          {products.map((product) => (
            <article className="st-pcard" key={product.id}>
              <div className="img" style={{ backgroundImage: `url('${product.image_url}')` }}>
                <span className={`badge ${product.status === "active" ? "pub" : "priv"}`}>{product.status}</span>
              </div>
              <div className="b">
                <div className="c">{product.designer_brand_name || "Unknown designer"}</div>
                <div className="n">{product.name}</div>
                <div className="st-prices">
                  <span className="supply">{product.category}</span>
                  {product.price ? <span className="retail">{product.price}</span> : null}
                </div>
                <AdminProductActions productId={product.id} status={product.status} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="st-empty">
          <div className="ic">PR</div>
          <p>아직 등록된 상품이 없습니다.</p>
        </div>
      )}
    </>
  );
}
