import Link from "next/link";
import { getAdminDashboardStats, getAllDesigners, getGeneratedLooksForAdmin } from "@/lib/db";
import { getApprovalStatusLabel } from "@/lib/status-labels";

export default async function AdminDashboardPage() {
  const [stats, designers, looks] = await Promise.all([
    getAdminDashboardStats(),
    getAllDesigners(),
    getGeneratedLooksForAdmin(8),
  ]);
  const pending = designers.filter((designer) => designer.approval_status === "pending").slice(0, 4);

  return (
    <>
      <h1 className="st-title">관리자 홈</h1>
      <p className="st-sub">디자이너 승인, 상품/AI 생성 현황, 운영 체크를 한 화면에서 봅니다.</p>

      <div className="st-stats admin-stats">
        <div className="st-stat"><div className="n">{stats.designersTotal}</div><div className="l">전체 디자이너</div></div>
        <div className="st-stat"><div className="n">{stats.pendingDesigners}</div><div className="l">승인 대기</div></div>
        <div className="st-stat"><div className="n">{stats.productsTotal}</div><div className="l">공개 상품</div></div>
        <div className="st-stat"><div className="n">{stats.generatedLooksTotal}</div><div className="l">AI 생성 이미지</div></div>
      </div>

      <div className="st-actions admin-actions-grid">
        <Link className="st-bigbtn dark" href="/dashboard/admin/designers">
          <div><div className="t">디자이너 승인 관리</div><div className="d">신규 브랜드를 승인하거나 비활성화합니다.</div></div>
          <div className="go">→</div>
        </Link>
        <Link className="st-bigbtn" href="/dashboard/admin/products">
          <div><div className="t">상품 전체 관리</div><div className="d">등록 상품을 확인하고 공개 상태를 조정합니다.</div></div>
          <div className="go">→</div>
        </Link>
        <Link className="st-bigbtn" href="/dashboard/admin/generated-looks">
          <div><div className="t">AI 생성 이미지 확인</div><div className="d">최근 생성 결과와 상태를 빠르게 점검합니다.</div></div>
          <div className="go">→</div>
        </Link>
      </div>

      <div className="st-grid2col">
        <section className="st-card">
          <div className="st-sec-head">
            <h2>승인 대기</h2>
            <Link href="/dashboard/admin/designers">전체 보기 →</Link>
          </div>
          {pending.length ? (
            <div className="admin-list">
              {pending.map((designer) => (
                <Link key={designer.id} className="admin-row" href={`/dashboard/admin/designers/${designer.id}`}>
                  <div>
                    <b>{designer.brand_name}</b>
                    <span>{designer.country || "국가 미입력"} · {designer.mood || "무드 미입력"}</span>
                  </div>
                  <em className="status-badge pending">{getApprovalStatusLabel(designer.approval_status)}</em>
                </Link>
              ))}
            </div>
          ) : (
            <div className="st-empty compact"><p>현재 승인 대기 디자이너가 없습니다.</p></div>
          )}
        </section>

        <section className="st-card">
          <div className="st-sec-head">
            <h2>최근 AI 생성</h2>
            <Link href="/dashboard/admin/generated-looks">전체 보기 →</Link>
          </div>
          {looks.length ? (
            <div className="admin-look-grid">
              {looks.map((look) => (
                <div key={look.id} className="admin-look-thumb" style={{ backgroundImage: `url('${look.image_url}')` }}>
                  <span>{look.designer_brand_name || "Unknown"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="st-empty compact"><p>아직 생성된 AI 이미지가 없습니다.</p></div>
          )}
        </section>
      </div>
    </>
  );
}
