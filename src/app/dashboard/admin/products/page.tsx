// 관리자: 디자이너 상품 전체 검수 — 필터·검색·일괄전환은 AdminProductsManager가 담당
import AdminProductsManager from "@/components/AdminProductsManager";
import { getProductsForAdmin } from "@/lib/db";

export default async function AdminProductsPage() {
  const products = await getProductsForAdmin();

  return (
    <>
      <h1 className="st-title">상품 전체 관리</h1>
      <p className="st-sub">디자이너가 올린 상품을 브랜드·상태별로 찾고, 한 번에 공개 상태를 조정합니다.</p>

      {products.length ? (
        <AdminProductsManager products={products} />
      ) : (
        <div className="st-empty">
          <div className="ic">PR</div>
          <p>아직 등록된 상품이 없습니다.</p>
        </div>
      )}
    </>
  );
}
