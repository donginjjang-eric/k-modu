export type Role = "admin" | "designer";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "disabled";
export type ProductStatus = "draft" | "active" | "hidden";
export type GeneratedLookStatus = "generated" | "approved" | "rejected" | "hidden";
export type GeneratedLookVideoStatus = "none" | "queued" | "processing" | "completed" | "failed";
export type PortfolioImageStatus = "pending" | "approved" | "rejected" | "hidden";
export type PortfolioImageKind = "profile" | "lookbook" | "product" | "sample";

export type User = {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  updated_at: string;
};

export type Designer = {
  id: string;
  user_id: string | null;
  brand_name: string;
  designer_name: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  mood: string;
  country: string;
  logo_url: string | null;
  approval_status: ApprovalStatus;
  daily_generation_limit: number;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  designer_id: string;
  name: string;
  category: string;
  price: string | null;
  supply_price: string | null;
  color: string | null;
  description: string | null;
  image_url: string;
  tryon_image_url: string | null;
  image_hash: string | null;
  mood: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};

export type DesignerPortfolioImage = {
  id: string;
  designer_id: string;
  title: string;
  kind: PortfolioImageKind;
  image_url: string;
  image_hash: string | null;
  status: PortfolioImageStatus;
  created_at: string;
  updated_at: string;
};

export type CollabRequestType = "sample" | "collab";
export type CollabRequestStatus = "new" | "read" | "done";

export type CollabRequest = {
  id: string;
  designer_id: string;
  request_type: CollabRequestType;
  creator_name: string;
  creator_contact: string;
  message: string;
  status: CollabRequestStatus;
  created_at: string;
  updated_at: string;
};

export type CreatorProposalType = "product_seeding" | "styling_content" | "campaign" | "long_term";
export type CreatorProposalStatus = "new" | "contacted" | "negotiating" | "matched" | "closed";

// 디자이너/브랜드 → 운영팀 → 큐레이션 크리에이터 협업 제안
// 현재 공개 크리에이터는 운영자가 관리하므로 creator_key/name을 접수 시점 스냅샷으로 보존한다.
export type CreatorCollabProposal = {
  id: string;
  requester_user_id: string | null;
  creator_key: string;
  creator_name: string;
  creator_platform: string;
  creator_market: string;
  brand_name: string;
  requester_name: string;
  requester_contact: string;
  proposal_type: CreatorProposalType;
  budget: string;
  message: string;
  status: CreatorProposalStatus;
  created_at: string;
  updated_at: string;
};

export type ModelTemplate = {
  id: string;
  name: string;
  type: "k_fashion_female" | "street" | "male";
  image_url: string;
  prompt_description: string;
  created_at: string;
  updated_at: string;
};

export type GeneratedLook = {
  id: string;
  designer_id: string;
  model_template_id: string;
  selected_product_ids: string[];
  cache_key: string;
  prompt: string;
  image_url: string;
  provider: "openai";
  cache_hit: boolean;
  status: GeneratedLookStatus;
  video_url: string | null;
  video_status: GeneratedLookVideoStatus;
  created_at: string;
  updated_at: string;
};

// 룩 페이지 레이아웃 종류 (1장/2장/3장/4장)
export type LookbookLayout = "full" | "duo" | "hero" | "grid";

// 룩북 구성 항목 — 선택 시점의 이미지 스냅샷을 저장해 원본 변경과 무관하게 유지
export type LookbookItem = {
  type: "look" | "portfolio" | "product";
  refId: string;
  imageUrl: string;
  videoUrl?: string | null;
  label?: string;
  // 배치 역할 — 디자이너가 놓은 자리 기준 (없으면 type으로 추정: product→index, 그 외→look)
  slot?: "look" | "index";
};

export type Lookbook = {
  id: string;
  designer_id: string;
  slug: string;
  title: string;
  tagline: string;
  status: "published" | "hidden";
  lang: "ko" | "en";
  intro: string;
  layouts: LookbookLayout[];
  items: LookbookItem[];
  created_at: string;
  updated_at: string;
};
