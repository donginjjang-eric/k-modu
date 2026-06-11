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
  const heroImage = approvedImages[0]?.image_url || portfolioImages[0]?.image_url || "/assets/designer-samples/model_1.png";

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
        <a className="st-btn light" href="/designers/maison-lune" target="_blank" rel="noreferrer">공개 화면 보기</a>
      </div>

      <section className="brand-public-preview">
        <div className="brand-preview-visual" style={{ backgroundImage: `url('${heroImage}')` }}>
          <span>첫 이미지</span>
        </div>
        <div className="brand-preview-copy">
          <p className="kicker">Designer Profile / Portfolio</p>
          <h2>{designer.brand_name}</h2>
          <strong>Representative looks and portfolio mood</strong>
          <p>{designer.description || "브랜드 소개를 입력하면 공개 프로필 첫 화면에 반영됩니다."}</p>
          <div className="brand-preview-tags">
            <span>Profile {profileImages.length}</span>
            <span>Lookbook {lookbookImages.length}</span>
            <span>Product {productImages.length}</span>
            <span>Sample {sampleImages.length}</span>
          </div>
          <div className="brand-preview-note">
            <b>{approvedImages.length}</b>
            <span>등록한 사진이 메인 카드 모달에 바로 노출됩니다.</span>
          </div>
        </div>
      </section>

      <div className="brand-profile-divider">
        <span>1. 프로필/포트폴리오 사진 정리</span>
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
