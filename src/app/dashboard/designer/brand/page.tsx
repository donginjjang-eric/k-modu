import { requireApprovedDesigner } from "@/lib/auth";
import BrandForm from "@/components/BrandForm";
import PortfolioManager from "@/components/PortfolioManager";
import { getPortfolioImagesForDesigner } from "@/lib/db";

export default async function DesignerBrandPage() {
  const { designer } = await requireApprovedDesigner();
  const portfolioImages = await getPortfolioImagesForDesigner(designer.id);
  const approvedImages = portfolioImages.filter((image) => image.status === "approved");
  const profileImages = portfolioImages.filter((image) => image.kind === "profile");
  const lookbookImages = portfolioImages.filter((image) => image.kind === "lookbook");
  const productImages = portfolioImages.filter((image) => image.kind === "product");
  const sampleImages = portfolioImages.filter((image) => image.kind === "sample");
  // 공개 카드 커버와 동일한 규칙: 메인 커버(profile) → 룩북 순. 없으면 빈 상태를 정직하게 보여준다.
  const coverImage = approvedImages.find((image) => image.kind === "profile")?.image_url
    || approvedImages.find((image) => image.kind === "lookbook")?.image_url
    || null;

  return (
    <>
      <div className="brand-profile-intro">
        <div>
          <span className="profile-flow-chip">메인 디자이너 카드 첫 화면</span>
          <h1 className="st-title">브랜드 프로필</h1>
          <p className="st-sub">
            공개 페이지에서 디자이너 카드를 눌렀을 때 가장 먼저 보이는 프로필 화면을 관리합니다.
          </p>
        </div>
        <a className="st-btn light" href={`/designers?open=${designer.id}`} target="_blank" rel="noreferrer">공개 화면 보기</a>
      </div>

      <section className="brand-public-preview">
        {coverImage ? (
          <div className="brand-preview-visual" style={{ backgroundImage: `url('${coverImage}')` }}>
            <span>메인 커버</span>
          </div>
        ) : (
          <div className="brand-preview-visual is-empty">
            <span>메인 커버가 비어 있어요</span>
            <p>브랜드를 대표할 3:4 세로 사진 1장을<br />먼저 등록해주세요</p>
          </div>
        )}
        <div className="brand-preview-copy">
          <p className="kicker">Designer Profile / Portfolio</p>
          <h2>{designer.brand_name}</h2>
          <strong>Representative looks and portfolio mood</strong>
          <p>{designer.description || "브랜드 소개를 입력하면 공개 프로필 첫 화면에 반영됩니다."}</p>
          <div className="brand-preview-tags">
            <span>메인 커버 {profileImages.length}</span>
            <span>룩북 {lookbookImages.length}</span>
            <span>제품 컷 {productImages.length}</span>
            <span>샘플/소재 {sampleImages.length}</span>
          </div>
          <div className="brand-preview-note">
            <b>{approvedImages.length}</b>
            <span>공개 중인 사진 — 등록한 사진은 공개 페이지 브랜드 카드에 바로 반영돼요.</span>
          </div>
        </div>
      </section>

      <div className="brand-profile-divider">
        <span>1. 브랜드 사진 관리</span>
        <p>사진을 먼저 정리하면 공개 카드 첫 화면과 포트폴리오 구성이 바로 보입니다.</p>
      </div>
      <PortfolioManager initialImages={portfolioImages} />

      <section className="brand-profile-workspace">
        <div>
          <div className="st-sec-head">
            <div>
              <h2>2. 브랜드 기본 정보</h2>
              <p className="st-sub tight">브랜드명, 소개, 무드는 프로필 첫 화면의 텍스트가 됩니다.</p>
            </div>
          </div>
          <BrandForm
            brandName={designer.brand_name}
            description={designer.description || ""}
            mood={designer.mood || ""}
          />
        </div>
      </section>
    </>
  );
}
