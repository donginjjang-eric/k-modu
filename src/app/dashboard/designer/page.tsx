import Link from "next/link";
import { requireApprovedDesigner } from "@/lib/auth";
import { getProductsForDesigner, getGeneratedLooksForDesigner } from "@/lib/db";

export default async function DesignerHome() {
  const { designer } = await requireApprovedDesigner();
  const [products, looks] = await Promise.all([
    getProductsForDesigner(designer.id),
    getGeneratedLooksForDesigner(designer.id),
  ]);
  const recent = products.slice(0, 6);

  return (
    <>
      <h1 className="st-title">안녕하세요, {designer.brand_name} 님 👋</h1>
      <p className="st-sub">오늘도 멋진 룩을 올려볼까요?</p>

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
