import { requireUser } from "@/lib/auth";

export default async function AdminGeneratedLooksPage() {
  await requireUser("admin");

  return (
    <main className="page">
      <p className="kicker">Admin Generated Looks</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>생성 이미지 확인</h1>
      <article className="dash-card">
        <p className="kicker">Phase 6</p>
        <h2>운영 로그 연결 예정</h2>
        <p className="notice">
          디자이너별 생성 횟수와 비용 관리는 generation_logs 기반으로 다음 단계에서 확장합니다.
        </p>
      </article>
    </main>
  );
}
