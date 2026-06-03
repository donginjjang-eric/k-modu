import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const databaseUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("MIGRATION_DATABASE_URL, DATABASE_PUBLIC_URL, or DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("railway") ? { rejectUnauthorized: false } : undefined,
});

function hashPassword(password, salt = randomBytes(16).toString("base64url")) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("base64url");
  return `${salt}:${hash}`;
}

async function upsertAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set. Skipping admin seed.");
    return;
  }

  await pool.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('admin-default', $1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = 'admin',
           updated_at = now()`,
    [email.toLowerCase(), hashPassword(password)],
  );
  console.log(`Admin seeded: ${email}`);
}

async function seedDemoData() {
  if (process.env.SEED_DEMO_DATA === "false") return;

  // 쉬운 데모 계정 — 디자이너: test / 1234
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('demo-designer-user', 'test', $1, 'designer')
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, role = 'designer', updated_at = now()`,
    [hashPassword("1234")],
  );

  // 쉬운 데모 계정 — 관리자: admin / 1234
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('demo-admin-user', 'admin', $1, 'admin')
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, role = 'admin', updated_at = now()`,
    [hashPassword("1234")],
  );

  await pool.query(
    `INSERT INTO designers (id, user_id, brand_name, description, mood, country, approval_status)
     VALUES (
       'maison-lune-seoul',
       'demo-designer-user',
       'Maison Lune Seoul',
       '서울 기반 디자이너 브랜드를 위한 AI 룩북 미리보기 MVP 샘플입니다.',
       'Seoul K-fashion, minimal black tailoring, warm editorial lookbook',
       'South Korea',
       'approved'
     )
     ON CONFLICT (id) DO UPDATE
       SET brand_name = EXCLUDED.brand_name,
           description = EXCLUDED.description,
           mood = EXCLUDED.mood,
           country = EXCLUDED.country,
           approval_status = EXCLUDED.approval_status,
           updated_at = now()`,
  );

  const templates = [
    ["fixed-female-minimal", "K-Fashion Female", "k_fashion_female", "/assets/mainmodel_2.png"],
    ["fixed-street", "Street", "street", "/assets/mainmodel_3.png"],
  ];

  for (const template of templates) {
    await pool.query(
      `INSERT INTO model_templates (id, name, type, image_url, prompt_description)
       VALUES ($1, $2, $3, $4, $2 || ' fixed model template for AI Lookbook Generation.')
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             type = EXCLUDED.type,
             image_url = EXCLUDED.image_url,
             prompt_description = EXCLUDED.prompt_description,
             updated_at = now()`,
      template,
    );
  }

  const products = [
    ["top-ivory-lace-bow", "Ivory Lace Bow Top", "Top", "/assets/designer-samples/product-top-ivory-lace-bow.png", "ivory lace bow top"],
    ["skirt-brown-polka-bubble", "Brown Polka Bubble Skirt", "Bottom", "/assets/designer-samples/product-skirt-brown-polka-bubble.png", "brown bubble skirt"],
    ["bag-black-glossy-shoulder", "Black Glossy Shoulder Bag", "Bag", "/assets/designer-samples/product-bag-black-glossy-shoulder.png", "black glossy bag"],
    ["shoes-black-cork-wedge-sandals", "Cork Wedge Sandals", "Shoes", "/assets/designer-samples/product-shoes-black-cork-wedge-sandals.png", "cork wedge sandals"],
  ];

  // Remove any stale demo products (e.g. the previous editorial set) before upserting.
  await pool.query(
    `DELETE FROM products WHERE designer_id = 'maison-lune-seoul' AND id <> ALL($1::text[])`,
    [products.map((product) => product[0])],
  );

  for (const product of products) {
    await pool.query(
      `INSERT INTO products (id, designer_id, name, category, image_url, image_hash, mood, status)
       VALUES ($1, 'maison-lune-seoul', $2, $3, $4, $1 || '-demo-v1', $5, 'active')
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             category = EXCLUDED.category,
             image_url = EXCLUDED.image_url,
             image_hash = EXCLUDED.image_hash,
             mood = EXCLUDED.mood,
             status = EXCLUDED.status,
             updated_at = now()`,
      product,
    );
  }

  console.log("Demo designer, templates, and products seeded.");
}

try {
  const schema = readFileSync(path.join(root, "db", "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("Schema applied.");
  await upsertAdmin();
  await seedDemoData();
} finally {
  await pool.end();
}
