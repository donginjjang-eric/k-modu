export type Role = "admin" | "designer";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "disabled";
export type ProductStatus = "draft" | "active" | "hidden";
export type GeneratedLookStatus = "generated" | "approved" | "rejected" | "hidden";

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
  created_at: string;
  updated_at: string;
};
