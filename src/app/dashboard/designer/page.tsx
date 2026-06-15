import Link from "next/link";
import { requireApprovedDesigner } from "@/lib/auth";
import { getProductsForDesigner, getGeneratedLooksForDesigner, getPortfolioImagesForDesigner } from "@/lib/db";

export default async function DesignerHome() {
  const { designer } = await requireApprovedDesigner();
  const [products, looks, portfolio] = await Promise.all([
    getProductsForDesigner(designer.id),
    getGeneratedLooksForDesigner(designer.id),
    getPortfolioImagesForDesigner(designer.id),
  ]);
  const recent = products.slice(0, 6);

  // 첫 진입 가이드: 커버 → 상품 → AI 룩. 다 채우면 가이드는 사라진다.
  const hasCover = portfolio.some((p) => (p.kind === "profile" || p.kind === "lookbook") && p.status === "approved");
  const setupSteps = [
    { done: hasCover, label: "메인 커버 사진 올리기", desc: "공개 카드 첫 화면에 보일 대표 사진 1장 (3:4 세로)", href: "/dashboard/designer/brand" },
    { done: products.length > 0, label: "보유 상품 등록", desc: "협업 가능한 상품 사진을 올려요", href: "/dashboard/designer/products" },
    { done: looks.length > 0, label: "AI 룩 만들기", desc: "상품을 골라 모델 착장 룩을 생성해요", href: "/dashboard/designer/generated-looks" },
  ];
  const setupDone = setupSteps.filter((s) => s.done).length;
  const setupComplete = setupDone === setupSteps.length;

  return (
    <>
      <h1 className="st-title">안녕하세요, {designer.brand_name} 님 👋</h1>
      <p className="st-sub">오늘도 멋진 룩을 올려볼까요?</p>

      {!setupComplete ? (
        <section className="st-card onboard-card">
          <div className="onboard-head">
            <div>
              <h2>시작 가이드 <span className="onboard-count">{setupDone}/{setupSteps.length}</span></h2>
              <p>아래 3단계만 채우면 공개 디자이너 카드가 완성돼요.</p>
            </div>
            <a className="onboard-preview" href={`/designers?open=${designer.id}`} target="_blank" rel="noreferrer">공개 화면 미리보기 →</a>
          </div>
          <div className="onboard-bar"><i style={{ width: `${(setupDone / setupSteps.length) * 100}%` }} /></div>
          <ol className="onboard-steps">
            {setupSteps.map((s, i) => (
              <li key={s.label} className={s.done ? "is-done" : ""}>
                <span className="ck">{s.done ? "✓" : i + 1}</span>
                <div className="onboard-step-copy"><b>{s.label}</b><small>{s.desc}</small></div>
                {s.done ? <span className="onboard-step-tag">완료</span> : <Link className="onboard-step-go" href={s.href}>하러 가기</Link>}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="st-stats">
        <div className="st-stat"><div className="n">{products.length}</div><div className="l">상품</div></div>
        <div className="st-stat"><div className="n">{looks.length}</div><div className="l">AI 룩</div></div>
        <div className="st-stat"><div className="n">0</div><div className="l">숏폼</div></div>
      </div>

      <div className="st-actions">
        <Link className="st-bigbtn dark" href="/dashboard/designer/products">
          <div><div className="t">＋ 상품 올리기</div><div className="d">사진만 올리면 끝, 자동으로 정리돼요</div></div>
          <div className="go">→</div>
        </Link>
        <Link className="st-bigbtn" href="/dashboard/designer/generated-looks">
          <div><div className="t">✨ AI 룩 만들기</div><div className="d">상품을 골라 모델 착장을 만들어요</div></div>
          <div className="go">→</div>
        </Link>
      </div>

      <div className="st-sec-head">
        <h2>최근 올린 상품</h2>
        <Link href="/dashboard/designer/products">더보기 →</Link>
      </div>
      {recent.length ? (
        <div className="st-rail">
          {recent.map((p) => (
            <div key={p.id} className="thumb" style={{ backgroundImage: `url('${p.image_url}')` }} />
          ))}
        </div>
      ) : (
        <div className="st-empty">
          <div className="ic">👕</div>
          <p>아직 올린 상품이 없어요. 첫 상품을 올려볼까요?</p>
          <Link className="st-btn" href="/dashboard/designer/products">＋ 상품 올리기</Link>
        </div>
      )}
    </>
  );
}
