import { requireApprovedDesigner } from "@/lib/auth";
import { getGeneratedLooksForDesigner } from "@/lib/db";

export default async function DesignerGeneratedLooksPage() {
  const { designer } = await requireApprovedDesigner();
  const looks = await getGeneratedLooksForDesigner(designer.id);

  return (
    <main className="page">
      <p className="kicker">Generated Looks</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>생성 이미지</h1>
      <section className="designer-grid">
        {looks.length ? looks.map((look) => (
          <article className="designer-card" key={look.id}>
            <img src={look.image_url} alt="AI lookbook preview" />
            <div className="designer-card-body">
              <p className="kicker">{look.cache_hit ? "Cached Look" : "New AI Look"}</p>
              <h2>Full Look Preview</h2>
              <p className="notice">{look.status} · {new Date(look.created_at).toLocaleString()}</p>
            </div>
          </article>
        )) : (
          <article className="dash-card">
            <p className="kicker">No Looks</p>
            <h2>아직 생성된 이미지가 없습니다.</h2>
            <p className="notice">스타일링 보드에서 상품을 2개 이상 선택한 뒤 Generate AI Look을 실행하세요.</p>
          </article>
        )}
      </section>
    </main>
  );
}
