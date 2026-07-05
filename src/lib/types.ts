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

// 룩북 구성 항목 — 선택 시점의 이미지 스냅샷을 저장해 원본 변경과 무관하게 유지
export type LookbookItem = {
  type: "look" | "portfolio" | "product";
  refId: string;
  imageUrl: string;
  videoUrl?: string | null;
  label?: string;
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
  items: LookbookItem[];
  created_at: string;
  updated_at: string;
};
