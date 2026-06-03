CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'designer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS designers (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  brand_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  mood text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  logo_url text,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  designer_id text NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  price text,
  supply_price text,
  color text,
  description text,
  image_url text NOT NULL,
  tryon_image_url text,
  image_hash text,
  mood text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 기존 DB 마이그레이션: 컬럼이 없으면 추가 (price=판매가, supply_price=공급가)
ALTER TABLE products ADD COLUMN IF NOT EXISTS supply_price text;

CREATE TABLE IF NOT EXISTS model_templates (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('k_fashion_female', 'street', 'male')),
  image_url text NOT NULL,
  prompt_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_looks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  designer_id text NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  model_template_id text NOT NULL REFERENCES model_templates(id),
  selected_product_ids jsonb NOT NULL,
  cache_key text NOT NULL,
  prompt text NOT NULL,
  image_url text NOT NULL,
  provider text NOT NULL DEFAULT 'openai',
  cache_hit boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'approved', 'rejected', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS generated_looks_cache_key_idx
  ON generated_looks(cache_key)
  WHERE status <> 'hidden';

CREATE TABLE IF NOT EXISTS generation_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  designer_id text REFERENCES designers(id) ON DELETE SET NULL,
  provider text NOT NULL,
  cache_key text,
  cache_hit boolean NOT NULL DEFAULT false,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generation_logs_daily_limit_idx
  ON generation_logs(designer_id, created_at, cache_hit, status);

CREATE INDEX IF NOT EXISTS products_designer_status_idx
  ON products(designer_id, status);
