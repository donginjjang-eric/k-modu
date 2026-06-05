import Link from "next/link";
import { notFound } from "next/navigation";
import AdminDesignerActions from "@/components/AdminDesignerActions";
import {
  getDesigner,
  getGeneratedLooksForDesigner,
  getProductsForDesignerForAdmin,
} from "@/lib/db";

function statusClass(status: string) {
  if (status === "approved" || status === "active" || status === "generated") return "approved";
  if (status === "disabled" || status === "hidden") return "disabled";
  return "pending";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default async function AdminDesignerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const designer = await getDesigner(id);
  if (!designer) notFound();

  const [products, looks] = await Promise.all([
    getProductsForDesignerForAdmin(designer.id),
    getGeneratedLooksForDesigner(designer.id),
  ]);

  return (
    <>
      <div className="st-sec-head">
        <div>
          <h1 className="st-title">{designer.brand_name}</h1>
          <p className="st-sub">브랜드 정보, 상품, AI 생성 이미지를 한 화면에서 확인합니다.</p>
        </div>
        <Link className="st-btn light" href="/dashboard/admin/designers">목록으로</Link>
      </div>

      <div className="st-grid2col">
        <section className="st-card">
          <div className="admin-detail-head">
            <div className="admin-avatar">{designer.brand_name.trim().charAt(0).toUpperCase()}</div>
            <div>
              <h2>{designer.brand_name}</h2>
              <em className={`status-badge ${statusClass(designer.approval_status)}`}>{designer.approval_status}</em>
            </div>
          </div>
          <div className="admin-meta-grid">
            <div><span>국가</span><b>{designer.country || "-"}</b></div>
            <div><span>등록일</span><b>{formatDate(designer.created_at)}</b></div>
            <div><span>상품</span><b>{products.length}</b></div>
            <div><span>AI 이미지</span><b>{looks.length}</b></div>
          </div>
          <p className="admin-detail-copy">{designer.description || "브랜드 설명이 아직 입력되지 않았습니다."}</p>
          <p className="admin-detail-copy muted">{designer.mood || "브랜드 무드가 아직 입력되지 않았습니다."}</p>
          <AdminDesignerActions designerId={designer.id} />
        </section>

        <section className="st-card">
          <div className="st-sec-head">
            <h2>최근 상품</h2>
            <Link href="/dashboard/admin/products">전체 상품 관리</Link>
          </div>
          {products.length ? (
            <div className="admin-look-grid">
              {products.slice(0, 8).map((product) => (
                <div key={product.id} className="admin-look-thumb" style={{ backgroundImage: `url('${product.image_url}')` }}>
                  <span>{product.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="st-empty compact"><p>아직 등록된 상품이 없습니다.</p></div>
          )}
        </section>
      </div>

      <section className="st-card" style={{ marginTop: 24 }}>
        <div className="st-sec-head">
          <h2>AI 생성 이미지</h2>
          <Link href="/dashboard/admin/generated-looks">전체 AI 이미지</Link>
        </div>
        {looks.length ? (
          <div className="admin-gallery">
            {looks.slice(0, 12).map((look) => (
              <article className="st-pcard" key={look.id}>
                <div className="img" style={{ backgroundImage: `url('${look.image_url}')` }}>
                  <span className={`badge ${look.status === "hidden" ? "priv" : "pub"}`}>{look.status}</span>
                </div>
                <div className="b">
                  <div className="c">{look.cache_hit ? "cached" : "live"}</div>
                  <div className="n">{formatDate(look.created_at)}</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="st-empty compact"><p>아직 생성된 AI 이미지가 없습니다.</p></div>
        )}
      </section>
    </>
  );
}
