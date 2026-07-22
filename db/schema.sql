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
  designer_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  mood text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  logo_url text,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE designers ADD COLUMN IF NOT EXISTS designer_name text NOT NULL DEFAULT '';
ALTER TABLE designers ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '';
ALTER TABLE designers ADD COLUMN IF NOT EXISTS contact_phone text NOT NULL DEFAULT '';
-- 디자이너별 공개 AI 생성 일일 한도 (관리자가 조정). 비용 가드의 핵심.
ALTER TABLE designers ADD COLUMN IF NOT EXISTS daily_generation_limit integer NOT NULL DEFAULT 20;

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

-- 승인 룩을 Veo image-to-video로 변환한 숏폼 MP4 (멱등 마이그레이션)
-- video_status: none(미생성) | queued | processing | completed | failed
ALTER TABLE generated_looks ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE generated_looks ADD COLUMN IF NOT EXISTS video_status text NOT NULL DEFAULT 'none';

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

CREATE TABLE IF NOT EXISTS designer_portfolio_images (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  designer_id text NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'lookbook' CHECK (kind IN ('profile', 'lookbook', 'product', 'sample')),
  image_url text NOT NULL,
  image_hash text,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS designer_portfolio_images_designer_status_idx
  ON designer_portfolio_images(designer_id, status, kind);

ALTER TABLE designer_portfolio_images
  ALTER COLUMN status SET DEFAULT 'approved';

-- 포트폴리오 즉시 공개 정책: 과거 pending 데이터 승격 (멱등)
UPDATE designer_portfolio_images
  SET status = 'approved', updated_at = now()
  WHERE status = 'pending';

-- 크리에이터 → 디자이너 의뢰 (샘플 요청 / 협업 제안)
CREATE TABLE IF NOT EXISTS collab_requests (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  designer_id text NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('sample', 'collab')),
  creator_name text NOT NULL,
  creator_contact text NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collab_requests_designer_idx
  ON collab_requests(designer_id, status, created_at DESC);

-- 브랜드/디자이너 → 운영팀 → 큐레이션 크리에이터 협업 제안
CREATE TABLE IF NOT EXISTS creator_collab_proposals (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  requester_user_id text REFERENCES users(id) ON DELETE SET NULL,
  creator_key text NOT NULL,
  creator_name text NOT NULL,
  creator_platform text NOT NULL DEFAULT '',
  creator_market text NOT NULL DEFAULT '',
  brand_name text NOT NULL,
  requester_name text NOT NULL,
  requester_contact text NOT NULL,
  proposal_type text NOT NULL CHECK (proposal_type IN ('product_seeding', 'styling_content', 'campaign', 'long_term')),
  budget text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'negotiating', 'matched', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_collab_proposals_status_idx
  ON creator_collab_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS creator_collab_proposals_creator_idx
  ON creator_collab_proposals(creator_key, created_at DESC);

-- 조회 성능 인덱스 (데이터가 쌓이기 전에 미리)
CREATE INDEX IF NOT EXISTS generated_looks_designer_status_idx
  ON generated_looks(designer_id, status);

CREATE INDEX IF NOT EXISTS designers_user_id_idx
  ON designers(user_id);

CREATE INDEX IF NOT EXISTS designers_contact_email_lower_idx
  ON designers(lower(contact_email));

-- 디자이너 룩북: 승인된 룩·포트폴리오·상품 이미지를 묶어 공개 링크(/lookbook/slug)로 공유
CREATE TABLE IF NOT EXISTS lookbooks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  designer_id text NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lookbooks_designer_idx
  ON lookbooks(designer_id, created_at DESC);

-- 룩북 다국어: 언어 표시 + 룩북 전용 인트로(영어판 번역본 저장)
ALTER TABLE lookbooks ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'ko';
ALTER TABLE lookbooks ADD COLUMN IF NOT EXISTS intro text NOT NULL DEFAULT '';

-- 룩북 페이지 레이아웃: 룩 페이지별 배치(full/duo/hero/grid) 시퀀스. 빈 배열이면 자동 배치.
ALTER TABLE lookbooks ADD COLUMN IF NOT EXISTS layouts jsonb NOT NULL DEFAULT '[]';
