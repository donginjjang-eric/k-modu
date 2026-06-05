import { readFileSync } from "node:fs";
import path from "node:path";
import { hashPassword } from "@/lib/auth";
import { query } from "@/lib/db";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return false;

  await query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('admin-default', $1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = 'admin',
           updated_at = now()`,
    [email.toLowerCase(), hashPassword(password)],
  );
  return true;
}

async function seedDemoData() {
  // 쉬운 데모 계정 — 디자이너: test / 1234
  await query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('demo-designer-user', 'test', $1, 'designer')
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, role = 'designer', updated_at = now()`,
    [hashPassword("1234")],
  );

  // 쉬운 데모 계정 — 관리자: admin / 1234
  await query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('demo-admin-user', 'admin', $1, 'admin')
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, role = 'admin', updated_at = now()`,
    [hashPassword("1234")],
  );

  await query(
    `INSERT INTO designers (id, user_id, brand_name, description, mood, country, approval_status)
     VALUES (
       'maison-lune-seoul',
       'demo-designer-user',
       'Maison Lune Seoul',
       '서울 기반 디자이너 브랜드를 위한 AI 착장 미리보기 MVP 샘플입니다.',
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
    await query(
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
  await query(
    `DELETE FROM products WHERE designer_id = 'maison-lune-seoul' AND id <> ALL($1::text[])`,
    [products.map((product) => product[0])],
  );

  for (const product of products) {
    await query(
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
}

export async function POST(request: Request) {
  const token = process.env.DB_SETUP_TOKEN;
  const requestToken = request.headers.get("x-setup-token");
  if (!token || requestToken !== token) {
    return Response.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const schema = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  await query(schema);
  const adminSeeded = await seedAdmin();
  const demoSeeded = process.env.SEED_DEMO_DATA === "true";
  if (demoSeeded) {
    await seedDemoData();
  }

  return Response.json({
    ok: true,
    schemaApplied: true,
    adminSeeded,
    demoSeeded,
  });
}
