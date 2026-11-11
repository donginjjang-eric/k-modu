CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'designer', 'creator', 'agency')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Existing installations use the legacy CHECK (role IN ('admin', 'designer', 'creator'))
-- constraint. Replace it in place so agency accounts can be added without
-- recreating the users table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;

  ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'designer', 'creator', 'agency'));
END $$;

CREATE TABLE IF NOT EXISTS designers (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  brand_name text NOT NULL,
  designer_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  brand_category text NOT NULL DEFAULT '미분류',
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
ALTER TABLE designers ADD COLUMN IF NOT EXISTS brand_category text NOT NULL DEFAULT '미분류';
-- 뷰티 셀프 가입 화면에서 받는 최소 브랜드 정보.
ALTER TABLE designers ADD COLUMN IF NOT EXISTS primary_product_category text;
ALTER TABLE designers ADD COLUMN IF NOT EXISTS brand_channel_url text;
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
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  detail_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  tryon_image_url text,
  image_hash text,
  mood text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'hidden')),
  approval_status text NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 기존 DB 마이그레이션: 컬럼이 없으면 추가 (price=판매가, supply_price=공급가)
ALTER TABLE products ADD COLUMN IF NOT EXISTS supply_price text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS detail_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
-- 현재 운영 정책은 자동 승인. 기존 상품도 승인 완료로 안전하게 백필된다.
ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_reason text;

-- 상세페이지 기능 도입 전에 등록된 뷰티 상품은 기존 갤러리를 상세 영역에도 표시한다.
-- 이미 상세 이미지를 등록한 상품과 패션 브랜드 상품은 변경하지 않는다.
UPDATE products AS p
SET detail_image_urls = p.image_urls,
    updated_at = now()
FROM designers AS d
WHERE d.id = p.designer_id
  AND LOWER(d.brand_category) IN ('beauty', 'k-beauty', '뷰티', 'k-뷰티')
  AND jsonb_typeof(p.detail_image_urls) = 'array'
  AND jsonb_array_length(p.detail_image_urls) = 0
  AND jsonb_typeof(p.image_urls) = 'array'
  AND jsonb_array_length(p.image_urls) > 0;

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

-- Creator Action Center: creator catalogue links, campaign workflow, and metrics.
CREATE TABLE IF NOT EXISTS creator_accounts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  creator_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  google_email text NOT NULL DEFAULT '',
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'disabled')),
  platform text NOT NULL DEFAULT '',
  market text NOT NULL DEFAULT '',
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  onboarding_source TEXT NOT NULL DEFAULT 'self_registered' CHECK (onboarding_source IN ('self_registered', 'admin')),
  claim_state TEXT NOT NULL DEFAULT 'claimed' CHECK (claim_state IN ('unclaimed', 'claimed')),
  created_by_admin_id text REFERENCES users(id) ON DELETE SET NULL,
  profile_image_url text,
  specialty text,
  bio text,
  instagram_handle text,
  instagram_url text,
  instagram_followers BIGINT NOT NULL DEFAULT 0 CHECK (instagram_followers >= 0),
  tiktok_handle text,
  tiktok_url text,
  tiktok_followers BIGINT NOT NULL DEFAULT 0 CHECK (tiktok_followers >= 0),
  followers_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Creator management fields are added separately so existing installations
-- receive the same columns as fresh databases.
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS onboarding_source TEXT NOT NULL DEFAULT 'self_registered'
  CHECK (onboarding_source IN ('self_registered', 'admin'));
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS claim_state TEXT NOT NULL DEFAULT 'claimed'
  CHECK (claim_state IN ('unclaimed', 'claimed'));
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS created_by_admin_id text REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS profile_image_url text;
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS instagram_handle text;
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS instagram_followers BIGINT NOT NULL DEFAULT 0 CHECK (instagram_followers >= 0);
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS tiktok_handle text;
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS tiktok_url text;
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS tiktok_followers BIGINT NOT NULL DEFAULT 0 CHECK (tiktok_followers >= 0);
ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS followers_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS creator_management_groups (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  agency_name text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_management_group_members (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id text NOT NULL REFERENCES creator_management_groups(id) ON DELETE CASCADE,
  creator_account_id text NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
  assigned_by text NOT NULL REFERENCES users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_account_id)
);

CREATE TABLE IF NOT EXISTS creator_management_group_users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id text NOT NULL REFERENCES creator_management_groups(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  invite_status text NOT NULL DEFAULT 'invited' CHECK (invite_status IN ('invited', 'active', 'revoked')),
  invited_by text NOT NULL REFERENCES users(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  UNIQUE (group_id, invited_email)
);

-- 한 계정이 관리자·크리에이터·패션·뷰티·대행사 권한을 독립적으로 보유하는 권한 원장.
CREATE TABLE IF NOT EXISTS user_workspace_memberships (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_type text NOT NULL CHECK (workspace_type IN ('admin', 'creator', 'fashion_partner', 'beauty_partner', 'agency')),
  resource_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled', 'rejected')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_workspace_memberships_identity_key
    UNIQUE NULLS NOT DISTINCT (user_id, workspace_type, resource_id)
);

CREATE INDEX IF NOT EXISTS user_workspace_memberships_user_status_idx
  ON user_workspace_memberships(user_id, status);

CREATE INDEX IF NOT EXISTS user_workspace_memberships_resource_idx
  ON user_workspace_memberships(workspace_type, resource_id);

-- 기존 중복 기본값은 가장 최근 항목 하나만 보존한 뒤 DB 수준에서 재발을 차단한다.
WITH ranked_defaults AS (
  SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS rank
    FROM user_workspace_memberships
   WHERE is_default = true AND status = 'active'
)
UPDATE user_workspace_memberships memberships
   SET is_default = false, updated_at = now()
  FROM ranked_defaults
 WHERE memberships.id = ranked_defaults.id AND ranked_defaults.rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_workspace_memberships_one_active_default_idx
  ON user_workspace_memberships(user_id)
  WHERE is_default = true AND status = 'active';

-- 한시적 오픈 정책: 사람 계정은 별도 승인 대기 없이 즉시 센터를 사용한다.
-- disabled/rejected와 상품·콘텐츠 공개 검수 상태는 변경하지 않는다.
ALTER TABLE designers ALTER COLUMN approval_status SET DEFAULT 'approved';
ALTER TABLE creator_accounts ALTER COLUMN approval_status SET DEFAULT 'approved';
ALTER TABLE user_workspace_memberships ALTER COLUMN status SET DEFAULT 'active';
UPDATE creator_accounts SET approval_status = 'approved' WHERE approval_status = 'pending';
UPDATE designers SET approval_status = 'approved' WHERE approval_status = 'pending';
UPDATE user_workspace_memberships SET status = 'active' WHERE status = 'pending' AND workspace_type IN ('creator', 'fashion_partner', 'beauty_partner');

-- 기존 기본 역할은 새 권한을 추가할 뿐 다른 작업공간을 제거하지 않는다.
INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
SELECT id, 'admin', NULL, 'active', role = 'admin'
  FROM users
 WHERE role = 'admin'
ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING;

INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
SELECT user_id, 'creator', id,
       CASE approval_status WHEN 'approved' THEN 'active' WHEN 'disabled' THEN 'disabled' ELSE 'pending' END,
       false
  FROM creator_accounts
 WHERE user_id IS NOT NULL
ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING;

-- 복합 브랜드는 동일 designer 리소스에 패션·뷰티 작업공간을 각각 만든다.
INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
SELECT designers.user_id, workspace_types.workspace_type, designers.id,
       CASE designers.approval_status
         WHEN 'approved' THEN 'active'
         WHEN 'disabled' THEN 'disabled'
         WHEN 'rejected' THEN 'rejected'
         ELSE 'pending'
       END,
       false
  FROM designers
  CROSS JOIN LATERAL (
    SELECT 'fashion_partner'::text AS workspace_type
     WHERE lower(trim(designers.brand_category)) IN ('k-패션', '패션', 'k-fashion', 'fashion', '미분류', '복합', '하이브리드', 'hybrid', 'both')
    UNION ALL
    SELECT 'beauty_partner'::text AS workspace_type
     WHERE lower(trim(designers.brand_category)) IN ('k-뷰티', '뷰티', 'k-beauty', 'beauty', '복합', '하이브리드', 'hybrid', 'both')
  ) workspace_types
 WHERE designers.user_id IS NOT NULL
ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING;

INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
SELECT user_id, 'agency', group_id,
       CASE invite_status WHEN 'active' THEN 'active' WHEN 'revoked' THEN 'disabled' ELSE 'pending' END,
       false
  FROM creator_management_group_users
 WHERE user_id IS NOT NULL
ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING;

CREATE TABLE IF NOT EXISTS creator_management_audit_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor_user_id text NOT NULL REFERENCES users(id),
  action text NOT NULL,
  group_id text REFERENCES creator_management_groups(id) ON DELETE SET NULL,
  creator_account_id text REFERENCES creator_accounts(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_management_group_members_group_idx
  ON creator_management_group_members(group_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS creator_management_group_users_email_lower_idx
  ON creator_management_group_users(group_id, lower(invited_email));

CREATE INDEX IF NOT EXISTS creator_management_audit_logs_group_created_idx
  ON creator_management_audit_logs(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS campaigns (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_type text NOT NULL DEFAULT 'admin' CHECK (owner_type IN ('admin', 'designer')),
  owner_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  designer_id text REFERENCES designers(id) ON DELETE RESTRICT,
  product_id text REFERENCES products(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text NOT NULL,
  markets jsonb NOT NULL DEFAULT '[]'::jsonb,
  platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  brief text NOT NULL DEFAULT '',
  reward_text text NOT NULL DEFAULT '',
  application_deadline timestamptz,
  content_deadline timestamptz,
  slots integer NOT NULL DEFAULT 1 CHECK (slots > 0),
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'recruiting', 'active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_designer_owner_check CHECK (
    (owner_type = 'admin' AND designer_id IS NULL)
    OR (owner_type = 'designer' AND designer_id IS NOT NULL)
  )
);

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS designer_id text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_id text;

-- Existing installations only allow admin ownership. Keep owner_id's users FK
-- intact for legacy/admin campaigns and add a dedicated designer FK for partner
-- campaigns so polymorphic ownership never weakens the existing reference.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_owner_type_check'
      AND conrelid = 'campaigns'::regclass
  ) THEN
    ALTER TABLE campaigns DROP CONSTRAINT campaigns_owner_type_check;
  END IF;

  ALTER TABLE campaigns
    ADD CONSTRAINT campaigns_owner_type_check
    CHECK (owner_type IN ('admin', 'designer'));

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_designer_id_fkey'
      AND conrelid = 'campaigns'::regclass
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_designer_id_fkey
      FOREIGN KEY (designer_id) REFERENCES designers(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_product_id_fkey'
      AND conrelid = 'campaigns'::regclass
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_designer_owner_check'
      AND conrelid = 'campaigns'::regclass
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_designer_owner_check CHECK (
        (owner_type = 'admin' AND designer_id IS NULL)
        OR (owner_type = 'designer' AND designer_id IS NOT NULL)
      );
  END IF;
END $$;

-- Preserve existing campaign rows while detaching any invalid legacy product
-- reference before enabling the write-time ownership guard.
UPDATE campaigns campaign
   SET product_id = NULL,
       updated_at = now()
 WHERE campaign.owner_type = 'designer'
   AND campaign.product_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
       FROM products product
      WHERE product.id = campaign.product_id
        AND product.designer_id = campaign.designer_id
   );

CREATE OR REPLACE FUNCTION enforce_campaign_product_designer_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_type = 'designer'
     AND NEW.product_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
         FROM products product
        WHERE product.id = NEW.product_id
          AND product.designer_id = NEW.designer_id
     ) THEN
    RAISE EXCEPTION 'Campaign product must belong to the campaign designer.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_product_campaign_designer_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.designer_id IS DISTINCT FROM OLD.designer_id
     AND EXISTS (
       SELECT 1
         FROM campaigns campaign
        WHERE campaign.product_id = OLD.id
          AND campaign.owner_type = 'designer'
          AND campaign.designer_id IS DISTINCT FROM NEW.designer_id
     ) THEN
    RAISE EXCEPTION 'Product designer cannot differ from a linked campaign designer.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'campaigns_product_designer_match_trigger'
      AND tgrelid = 'campaigns'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER campaigns_product_designer_match_trigger
      BEFORE INSERT OR UPDATE ON campaigns
      FOR EACH ROW
      EXECUTE FUNCTION enforce_campaign_product_designer_match();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'products_campaign_designer_match_trigger'
      AND tgrelid = 'products'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER products_campaign_designer_match_trigger
      BEFORE UPDATE OF designer_id ON products
      FOR EACH ROW
      EXECUTE FUNCTION enforce_product_campaign_designer_match();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS campaign_participations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_account_id text NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('application', 'invitation')),
  status text NOT NULL CHECK (status IN ('applied', 'invited', 'matched', 'shipping', 'creating', 'review', 'published', 'settlement', 'completed', 'cancelled')),
  next_action text NOT NULL DEFAULT '',
  shipping_note text NOT NULL DEFAULT '',
  expected_reward text NOT NULL DEFAULT '',
  settlement_status text NOT NULL DEFAULT 'none' CHECK (settlement_status IN ('none', 'pending', 'confirmed', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_account_id)
);

CREATE TABLE IF NOT EXISTS content_submissions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  participation_id text NOT NULL REFERENCES campaign_participations(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  content_url text NOT NULL,
  caption_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'revision_requested', 'approved', 'published')),
  review_note text NOT NULL DEFAULT '',
  published_url text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  UNIQUE (participation_id, version)
);

CREATE TABLE IF NOT EXISTS campaign_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  participation_id text NOT NULL REFERENCES campaign_participations(id) ON DELETE CASCADE,
  actor_user_id text REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_performance (
  participation_id text PRIMARY KEY REFERENCES campaign_participations(id) ON DELETE CASCADE,
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  likes integer NOT NULL DEFAULT 0 CHECK (likes >= 0),
  comments integer NOT NULL DEFAULT 0 CHECK (comments >= 0),
  orders integer NOT NULL DEFAULT 0 CHECK (orders >= 0),
  revenue numeric(12, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  currency text NOT NULL DEFAULT 'KRW',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_accounts_user_id_idx
  ON creator_accounts(user_id);

CREATE INDEX IF NOT EXISTS campaigns_recruiting_filters_idx
  ON campaigns(status, application_deadline, category)
  WHERE status = 'recruiting';

CREATE INDEX IF NOT EXISTS campaigns_designer_owner_idx
  ON campaigns(owner_type, designer_id, created_at DESC)
  WHERE owner_type = 'designer';

CREATE INDEX IF NOT EXISTS campaigns_product_idx
  ON campaigns(product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS campaign_participations_creator_status_idx
  ON campaign_participations(creator_account_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS content_submissions_participation_version_idx
  ON content_submissions(participation_id, version DESC);

CREATE INDEX IF NOT EXISTS campaign_events_participation_date_idx
  ON campaign_events(participation_id, created_at DESC);
