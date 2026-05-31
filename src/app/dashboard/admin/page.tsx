import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="page">
      <p className="kicker">Admin Dashboard</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>관리자 대시보드</h1>
      <section className="dashboard-grid">
        <Link className="dash-card" href="/dashboard/admin/designers">
          <p className="kicker">Designers</p>
          <h2>디자이너 승인</h2>
          <p className="notice">Phase 3에서 승인/비활성화 기능을 연결합니다.</p>
        </Link>
        <Link className="dash-card" href="/dashboard/admin/generated-looks">
          <p className="kicker">Logs</p>
          <h2>생성 이미지 확인</h2>
          <p className="notice">Phase 6에서 생성 로그와 비용 관리용 화면을 연결합니다.</p>
        </Link>
      </section>
    </main>
  );
}
