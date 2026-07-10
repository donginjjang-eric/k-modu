import Image from "next/image";

export default function LoginEditorialPanel() {
  return (
    <section className="login-editorial" aria-label="K-MODU 브랜드 소개">
      <Image
        className="login-editorial-image"
        src="/assets/LOGIN_IMG1.png"
        alt="한국 디자이너 브랜드의 에디토리얼 룩북 이미지"
        width={1132}
        height={1390}
        priority
        sizes="(max-width: 820px) 100vw, 52vw"
      />
      <div className="login-editorial-overlay" aria-hidden="true" />
      <div className="login-editorial-copy">
        <p className="login-editorial-kicker">K-MODU / DESIGNER STUDIO</p>
        <h2>
          한국 패션을
          <br />
          세계와 연결합니다.
        </h2>
        <p>디자이너 브랜드의 룩북 제작부터 글로벌 크리에이터 협업까지.</p>
        <div className="login-editorial-tags">
          <span>AI LOOKBOOK</span>
          <span>DIGITAL SHOWROOM</span>
          <span>GLOBAL COLLABORATION</span>
        </div>
      </div>
    </section>
  );
}
