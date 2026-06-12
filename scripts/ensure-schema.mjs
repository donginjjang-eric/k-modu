// 부팅 시 1회 실행: db/schema.sql(단일 스키마 소스)을 멱등 적용하고, 환경변수로 백업 관리자 계정을 시드한다.
// 요청 경로에서 ALTER TABLE이 돌던 지연 마이그레이션을 대체한다. 어떤 경우에도 exit 0 — 앱 기동을 막지 않는다.
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("[schema] DATABASE_URL not configured, skipping");
    process.exit(0);
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("railway") && !databaseUrl.includes(".railway.internal")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const schema = readFileSync(path.join(root, "db", "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("[schema] applied db/schema.sql");

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

  await pool.end();
} catch (error) {
  console.error("[schema] failed (app will still start):", error?.message || error);
}
process.exit(0);
