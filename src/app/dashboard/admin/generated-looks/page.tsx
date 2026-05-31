import { designer } from "@/lib/phase1-data";

export default function AdminGeneratedLooksPage() {
  return (
    <main className="page">
      <p className="kicker">Admin Generated Looks</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>생성 이미지 확인</h1>
      <article className="designer-card">
        <img src={designer.heroImage} alt="AI lookbook admin preview" />
        <div className="designer-card-body">
          <p className="kicker">Phase 1 Preview</p>
          <h2>AI 룩북 이미지 생성</h2>
          <p className="notice">Phase 6에서 generation_logs 기반 운영 화면으로 확장합니다.</p>
        </div>
      </article>
    </main>
  );
}
