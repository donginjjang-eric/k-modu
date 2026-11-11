import { requireBeautyPartner } from "@/lib/auth";
import { getPortfolioImagesForDesigner, getProductsForDesigner } from "@/lib/db";
import BeautyPartnerHome from "@/components/BeautyPartnerHome";

export default async function BeautyPartnerPage() {
  const { designer } = await requireBeautyPartner();
  const [products, portfolio] = await Promise.all([
    getProductsForDesigner(designer.id),
    getPortfolioImagesForDesigner(designer.id),
  ]);

  const hasApprovedCover = portfolio.some((image) => image.kind === "profile" && image.status === "approved");
  const profileChecks = [
    Boolean(designer.brand_name.trim()),
    Boolean(designer.description.trim()),
    Boolean(designer.mood.trim()),
    hasApprovedCover,
  ];
  const publishedProductCount = products.filter((product) => product.status === "active" && product.approval_status === "approved").length;
  const nextSteps = [
    {
      done: profileChecks.every(Boolean),
      title: "브랜드 프로필 완성",
      description: "브랜드 소개, 키워드와 대표 이미지를 정리하세요.",
      href: "/dashboard/beauty/brand",
    },
    {
      done: products.length > 0,
      title: "첫 협업 상품 등록",
      description: "크리에이터에게 제안할 제품 사진과 정보를 등록하세요.",
      href: "/dashboard/beauty/products",
    },
    {
      done: publishedProductCount > 0,
      title: "협업 상품 공개",
      description: "등록한 상품 중 캠페인에 사용할 상품을 공개 상태로 전환하세요.",
      href: "/dashboard/beauty/products",
    },
  ];

  return (
    <BeautyPartnerHome
      brandName={designer.brand_name}
      profileCompleted={profileChecks.filter(Boolean).length}
      profileTotal={profileChecks.length}
      productCount={products.length}
      publishedProductCount={publishedProductCount}
      nextSteps={nextSteps}
    />
  );
}
