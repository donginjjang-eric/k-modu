import Link from "next/link";

export default function DesignerDashboardPage() {
  return (
    <main className="page">
      <p className="kicker">Designer Dashboard</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>디자이너 대시보드</h1>
      <section className="dashboard-grid">
        <Link className="dash-card" href="/dashboard/designer/products">
          <p className="kicker">Products</p>
          <h2>상품 관리</h2>
          <p className="notice">Phase 4에서 상품 등록/수정/삭제와 이미지 업로드를 연결합니다.</p>
        </Link>
        <Link className="dash-card" href="/dashboard/designer/generated-looks">
          <p className="kicker">Generated Looks</p>
          <h2>생성 이미지</h2>
          <p className="notice">Phase 5에서 AI 룩북 생성 결과와 캐시 상태를 보여줍니다.</p>
        </Link>
      </section>
    </main>
  );
}
