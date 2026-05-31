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
  await query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('demo-designer-user', 'designer@k-modu.test', $1, 'designer')
     ON CONFLICT (email) DO NOTHING`,
    [hashPassword("kmodu-demo-password")],
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
    ["fixed-male", "Male", "male", "/assets/mainmodel_4.png"],
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
    ["structured-black-coat", "Structured Black Coat", "Outer", "/assets/designer-profile-real-09.png", "minimal black outer"],
    ["tailored-black-trouser", "Tailored Black Trouser", "Bottom", "/assets/designer-profile-real-10.png", "tailored black bottom"],
    ["slim-black-sunglasses", "Slim Black Sunglasses", "Eyewear", "/assets/designer-profile-real-11.png", "sharp black eyewear"],
    ["soft-leather-tote", "Soft Leather Tote", "Bag", "/assets/designer-profile-real-12.png", "soft leather tote"],
    ["minimal-black-shoes", "Minimal Black Shoes", "Shoes", "/assets/designer-profile-real-13.png", "minimal black shoes"],
    ["clean-inner-top", "Clean Inner Top", "Inner", "/assets/designer-profile-real-02.png", "clean black inner"],
  ];

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
  await seedDemoData();

  return Response.json({
    ok: true,
    schemaApplied: true,
    adminSeeded,
    demoSeeded: true,
  });
}
