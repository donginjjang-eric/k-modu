import { designer } from "@/lib/phase1-data";

export default function DesignerGeneratedLooksPage() {
  return (
    <main className="page">
      <p className="kicker">Generated Looks</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>생성 이미지</h1>
      <section className="designer-grid">
        <article className="designer-card">
          <img src={designer.heroImage} alt="Cached AI lookbook preview" />
          <div className="designer-card-body">
            <p className="kicker">Cached Look</p>
            <h2>Full Look Preview</h2>
            <p className="notice">현재는 HTML MVP 검증 이미지를 참고용으로 표시합니다.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
