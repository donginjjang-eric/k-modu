import { designer } from "@/lib/phase1-data";

export default function AdminDesignersPage() {
  return (
    <main className="page">
      <p className="kicker">Admin Designers</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>디자이너 승인 관리</h1>
      <article className="dash-card">
        <p className="kicker">Approved Demo</p>
        <h2>{designer.brandName}</h2>
        <p className="notice">Phase 3에서 DB 승인 상태와 관리자 액션을 연결합니다.</p>
      </article>
    </main>
  );
}
