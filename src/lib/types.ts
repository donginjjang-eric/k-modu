export type Role = "admin" | "designer" | "creator" | "agency";
export type WorkspaceType = "admin" | "creator" | "fashion_partner" | "beauty_partner" | "agency";
export type WorkspaceStatus = "pending" | "active" | "disabled" | "rejected";
export type UserWorkspaceMembership = {
  id: string;
  user_id: string;
  workspace_type: WorkspaceType;
  resource_id: string | null;
  status: WorkspaceStatus;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};
export type ApprovalStatus = "pending" | "approved" | "rejected" | "disabled";
export type CreatorApprovalStatus = "pending" | "approved" | "disabled";
export type CreatorOnboardingSource = "self_registered" | "admin";
export type CreatorClaimState = "unclaimed" | "claimed";
export type CreatorManagementGroupStatus = "active" | "inactive";
export type AgencyInviteStatus = "invited" | "active" | "revoked";
export type CampaignStatus = "draft" | "recruiting" | "active" | "closed";
export type CampaignOwnerType = "admin" | "designer";
export type ParticipationStatus = "applied" | "invited" | "matched" | "shipping" | "creating" | "review" | "published" | "settlement" | "completed" | "cancelled";
export type AdminCampaignStatus = CampaignStatus;
export type AdminParticipationAction = "approve" | "reject" | "cancel" | "shipping" | "creating" | "review" | "published" | "settlement" | "completed";
export type AdminCampaignInput = {
  title: string;
  category: string;
  markets: string[];
  platforms: string[];
  brief: string;
  reward_text: string;
  application_deadline: string;
  content_deadline: string;
  slots: number;
  image_urls?: string[];
};
export type BeautyCampaignInput = AdminCampaignInput & { product_id: string };
export type SettlementStatus = "none" | "pending" | "confirmed" | "paid";
export type SubmissionStatus = "submitted" | "revision_requested" | "approved" | "published";
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

export type CreatorAccount = {
  id: string;
  user_id: string | null;
  creator_key: string;
  display_name: string;
  google_email: string;
  approval_status: CreatorApprovalStatus;
  platform: string;
  market: string;
  categories: string[];
  onboarding_source: CreatorOnboardingSource;
  claim_state: CreatorClaimState;
  created_by_admin_id: string | null;
  profile_image_url: string | null;
  specialty: string | null;
  bio: string | null;
  instagram_handle: string | null;
  instagram_url: string | null;
  instagram_followers: number;
  tiktok_handle: string | null;
  tiktok_url: string | null;
  tiktok_followers: number;
  followers_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Campaign = {
  id: string;
  owner_type: CampaignOwnerType;
  owner_id: string;
  designer_id: string | null;
  product_id: string | null;
  title: string;
  category: string;
  markets: string[];
  platforms: string[];
  brief: string;
  reward_text: string;
  application_deadline: string | null;
  content_deadline: string | null;
  slots: number;
  image_urls: string[];
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
};

export type AdminCampaignListItem = Campaign & {
  application_count: number;
  matched_count: number;
};

export type CampaignParticipation = {
  id: string;
  campaign_id: string;
  creator_account_id: string;
  source: "application" | "invitation";
  status: ParticipationStatus;
  next_action: string;
  shipping_note: string;
  expected_reward: string;
  settlement_status: SettlementStatus;
  created_at: string;
  updated_at: string;
};

export type ContentSubmission = {
  id: string;
  participation_id: string;
  version: number;
  content_url: string;
  caption_text: string;
  status: SubmissionStatus;
  review_note: string;
  published_url: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  published_at: string | null;
};

export type CampaignEvent = {
  id: string;
  participation_id: string;
  actor_user_id: string | null;
  event_type: string;
  from_status: ParticipationStatus | null;
  to_status: ParticipationStatus | null;
  message: string;
  created_at: string;
};

export type CampaignPerformance = {
  participation_id: string;
  views: number;
  likes: number;
  comments: number;
  orders: number;
  revenue: number;
  currency: string;
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
  brand_category: string;
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
  image_urls: string[];
  detail_image_urls: string[];
  tryon_image_url: string | null;
  image_hash: string | null;
  mood: string | null;
  status: ProductStatus;
  approval_status: ApprovalStatus;
  moderation_reason?: string | null;
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
