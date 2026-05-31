import { getPublicDesigners } from "@/lib/db";

export default async function AdminDesignersPage() {
  const designers = await getPublicDesigners();

  return (
    <main className="page">
      <p className="kicker">Admin Designers</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>디자이너 승인 관리</h1>
      {designers.map((designer) => (
        <article className="dash-card" key={designer.id}>
          <p className="kicker">{designer.approval_status}</p>
          <h2>{designer.brand_name}</h2>
          <p className="notice">Phase 3에서 승인/비활성화 액션을 연결합니다.</p>
        </article>
      ))}
    </main>
  );
}
