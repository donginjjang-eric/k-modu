import Link from "next/link";
import { designer } from "@/lib/phase1-data";

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="kicker">AI Lookbook Generation</p>
          <h1>K-MODU</h1>
          <p className="lead">
            디자이너 상품 조합을 고정 모델에게 입힌 것처럼 보여주는 브랜드 룩북 이미지 생성 서비스입니다.
            현재 화면은 HTML MVP에서 검증한 UX를 Next.js 구조로 이관한 Phase 1 틀입니다.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <Link className="pill" href="/designers">디자이너 보기</Link>
            <Link className="pill light" href="/designers/maison-lune-seoul">스타일링 보드</Link>
          </div>
        </div>
        <div className="hero-media">
          <img src={designer.heroImage} alt="K-MODU AI lookbook preview" />
        </div>
      </section>
    </main>
  );
}
