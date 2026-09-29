// 부팅 시 1회 실행: db/schema.sql(단일 스키마 소스)을 멱등 적용하고, 환경변수로 백업 관리자 계정을 시드한다.
// 필수 스키마 적용·검증 실패는 앱 기동을 중단하고, 선택적 시드 실패만 경고로 남긴다.
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { applyRequiredSchema } from "./schema-bootstrap.mjs";
import { syncMalaysiaMeetingCreators } from "./sync-malaysia-meeting-creators.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pool;
let requiredSchemaApplied = false;

try {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("[schema] DATABASE_URL not configured, skipping");
    process.exit(0);
  }

  pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("railway") && !databaseUrl.includes(".railway.internal")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const schema = readFileSync(path.join(root, "db", "schema.sql"), "utf8");
  await applyRequiredSchema(pool, schema);
  requiredSchemaApplied = true;
  console.log("[schema] applied and validated db/schema.sql");

  // 백업 관리자 시드 (구글 OAuth 장애 대비). ADMIN_EMAIL/ADMIN_PASSWORD가 설정된 경우에만.
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (email && password) {
    const salt = randomBytes(16).toString("base64url");
    const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("base64url");
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ('admin-backup', $1, $2, 'admin')
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, role = 'admin', updated_at = now()`,
      [email, `${salt}:${hash}`],
    );
    console.log(`[schema] backup admin ensured: ${email}`);
  }

  const { rows: [adminUser] } = email
    ? await pool.query(
      "SELECT id FROM users WHERE lower(email) = $1 AND role = 'admin' LIMIT 1",
      [email],
    )
    : { rows: [] };
  await syncMalaysiaMeetingCreators(pool, adminUser?.id ?? null);
  console.log("[schema] curated creators synchronized");

  // 테스트 계정 시드 (구글 로그인 없이 디자이너/크리에이터 동선을 확인하기 위한 비밀번호 계정).
  // TEST_ACCOUNT_PASSWORD가 설정된 경우에만 만들고, 매 부팅마다 비밀번호·승인 상태를 다시 맞춘다.
  const testPassword = process.env.TEST_ACCOUNT_PASSWORD || "";
  if (testPassword) {
    const hashOf = (plain) => {
      const salt = randomBytes(16).toString("base64url");
      return `${salt}:${pbkdf2Sync(plain, salt, 120000, 32, "sha256").toString("base64url")}`;
    };
    const designerEmail = "test-designer@k-modu.co.kr";
    const creatorEmail = "test-creator@k-modu.co.kr";

    const { rows: [designerUser] } = await pool.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ('test-designer', $1, $2, 'designer')
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, role = 'designer', updated_at = now()
       RETURNING id`,
      [designerEmail, hashOf(testPassword)],
    );
    const designerUpdated = await pool.query(
      "UPDATE designers SET approval_status = 'approved', updated_at = now() WHERE user_id = $1",
      [designerUser.id],
    );
    if (!designerUpdated.rowCount) {
      await pool.query(
        `INSERT INTO designers (id, user_id, brand_name, designer_name, contact_email, description, mood, country, approval_status)
         VALUES ('test-designer-brand', $1, 'K-MODU 테스트 브랜드', '테스트 디자이너', $2, '테스트 계정용 샘플 브랜드입니다.', 'minimal', 'South Korea', 'approved')
         ON CONFLICT (id) DO UPDATE
           SET user_id = EXCLUDED.user_id, approval_status = 'approved', updated_at = now()`,
        [designerUser.id, designerEmail],
      );
    }

    const { rows: [creatorUser] } = await pool.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ('test-creator', $1, $2, 'creator')
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, role = 'creator', updated_at = now()
       RETURNING id`,
      [creatorEmail, hashOf(testPassword)],
    );
    const creatorUpdated = await pool.query(
      "UPDATE creator_accounts SET approval_status = 'approved', google_email = $2, updated_at = now() WHERE user_id = $1",
      [creatorUser.id, creatorEmail],
    );
    if (!creatorUpdated.rowCount) {
      await pool.query(
        `INSERT INTO creator_accounts (user_id, creator_key, display_name, google_email, approval_status, platform, market, categories)
         VALUES ($1, 'test-creator', 'K-MODU 테스트 크리에이터', $2, 'approved', 'TikTok', 'Malaysia', '["fashion","beauty"]'::jsonb)
         ON CONFLICT (creator_key) DO UPDATE
           SET user_id = EXCLUDED.user_id, google_email = EXCLUDED.google_email, approval_status = 'approved', updated_at = now()`,
        [creatorUser.id, creatorEmail],
      );
    }
    console.log(`[schema] test accounts ensured: ${designerEmail}, ${creatorEmail}`);
  }

  // 모델 템플릿 베이스 이미지는 코드가 소유하는 플랫폼 설정 — 부팅 시 동기화 (2026-06-13 신규 모델로 교체)
  const templateImages = [
    ["k_fashion_female", "assets/designer-samples/model_kfashion_base2.jpg"],
    ["street", "assets/designer-samples/model_street_base2.jpg"],
  ];
  for (const [type, imageUrl] of templateImages) {
    const result = await pool.query(
      "UPDATE model_templates SET image_url = $2, updated_at = now() WHERE type = $1 AND image_url <> $2",
      [type, imageUrl],
    );
    if (result.rowCount) console.log(`[schema] model template image synced: ${type}`);
  }
} catch (error) {
  if (requiredSchemaApplied) {
    console.error("[schema] optional setup failed; required schema is ready:", error?.message || error);
  } else {
    console.error("[schema] required bootstrap failed; startup aborted:", error?.message || error);
    process.exitCode = 1;
  }
} finally {
  if (pool) await pool.end();
}
