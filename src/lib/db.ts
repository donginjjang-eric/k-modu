import { Pool } from "pg";
import type { QueryResultRow } from "pg";
import { designer as phaseDesigner, modelTemplates as phaseTemplates, products as phaseProducts } from "./phase1-data";
import type { Designer, GeneratedLook, ModelTemplate, Product, User } from "./types";

let pool: Pool | null = null;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function canUseDemoData() {
  return process.env.NODE_ENV !== "production" || process.env.KMODU_ENABLE_DEMO === "true";
}

function requireDatabaseForProduction() {
  if (!canUseDemoData()) {
    throw new Error("DATABASE_URL is required in production.");
  }
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    const useSsl = !process.env.DATABASE_URL.includes(".railway.internal");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl && process.env.DATABASE_URL.includes("railway") ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
  const result = await getDb().query<T>(sql, params);
  return result.rows;
}

export async function one<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function ensureEasyAccessAccounts() {
  if (!hasDatabase()) return;

  await query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('demo-admin-user', 'admin', '1234', 'admin')
     ON CONFLICT (email) DO UPDATE
       SET password_hash = '1234',
           role = 'admin',
           updated_at = now()`,
  );

  await query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('demo-designer-user', 'test', '1234', 'designer')
     ON CONFLICT (email) DO UPDATE
       SET password_hash = '1234',
           role = 'designer',
           updated_at = now()`,
  );

  await query(
    `INSERT INTO designers (id, user_id, brand_name, description, mood, country, approval_status)
     VALUES (
       'maison-lune-seoul',
       'demo-designer-user',
       'Maison Lune Seoul',
       'Easy-access designer account for K-MODU service testing.',
       'Seoul K-fashion, minimal black tailoring, warm editorial lookbook',
       'South Korea',
       'approved'
     )
     ON CONFLICT (id) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           approval_status = 'approved',
           updated_at = now()`,
  );
}

export function toDemoDesigner(): Designer {
  const now = new Date("2026-05-30T00:00:00Z").toISOString();
  return {
    id: phaseDesigner.id,
    user_id: "demo-designer-user",
    brand_name: phaseDesigner.brandName,
    description: phaseDesigner.description,
    mood: phaseDesigner.mood,
    country: phaseDesigner.country,
    logo_url: null,
    approval_status: "approved",
    created_at: now,
    updated_at: now,
  };
}

export function toDemoProducts(): Product[] {
  const now = new Date("2026-05-30T00:00:00Z").toISOString();
  return phaseProducts.map((product) => ({
    id: product.id,
    designer_id: phaseDesigner.id,
    name: product.name,
    category: product.category,
    price: null,
    supply_price: null,
    color: null,
    description: product.status,
    image_url: product.image,
    tryon_image_url: null,
    image_hash: `${product.id}-demo-v1`,
    mood: phaseDesigner.mood,
    status: "active",
    created_at: now,
    updated_at: now,
  }));
}

export function toDemoModelTemplates(): ModelTemplate[] {
  const now = new Date("2026-05-30T00:00:00Z").toISOString();
  return phaseTemplates.map((template) => ({
    id: template.id,
    name: template.label,
    type: template.id === "fixed-male" ? "male" : template.id === "fixed-street" ? "street" : "k_fashion_female",
    image_url: template.image,
    prompt_description: `${template.label} fixed model template for AI Lookbook Generation.`,
    created_at: now,
    updated_at: now,
  }));
}

export async function getPublicDesigners(): Promise<Designer[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return [toDemoDesigner()];
  }
  try {
    return await query<Designer>("SELECT * FROM designers WHERE approval_status = 'approved' ORDER BY created_at DESC");
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return [toDemoDesigner()];
  }
}

export async function getAllDesigners(): Promise<Designer[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return [toDemoDesigner()];
  }
  try {
    return await query<Designer>("SELECT * FROM designers ORDER BY created_at DESC");
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return [toDemoDesigner()];
  }
}

export async function getDesigner(id: string): Promise<Designer | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return id === phaseDesigner.id ? toDemoDesigner() : null;
  }
  try {
    return await one<Designer>("SELECT * FROM designers WHERE id = $1", [id]);
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return id === phaseDesigner.id ? toDemoDesigner() : null;
  }
}

export async function getProductsForDesigner(designerId: string): Promise<Product[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return designerId === phaseDesigner.id ? toDemoProducts() : [];
  }
  try {
    return await query<Product>(
      "SELECT * FROM products WHERE designer_id = $1 AND status <> 'hidden' ORDER BY created_at DESC",
      [designerId],
    );
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return designerId === phaseDesigner.id ? toDemoProducts() : [];
  }
}

export async function getProductForDesigner(designerId: string, productId: string): Promise<Product | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return toDemoProducts().find((product) => product.designer_id === designerId && product.id === productId) ?? null;
  }
  return one<Product>(
    "SELECT * FROM products WHERE designer_id = $1 AND id = $2 AND status <> 'hidden'",
    [designerId, productId],
  );
}

export async function getOwnedProductsForGeneration(designerId: string, productIds: string[]): Promise<Product[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return toDemoProducts().filter((product) => product.designer_id === designerId && productIds.includes(product.id));
  }
  return query<Product>(
    "SELECT * FROM products WHERE designer_id = $1 AND id = ANY($2::text[]) AND status <> 'hidden'",
    [designerId, productIds],
  );
}

export async function createProductForDesigner(input: {
  designerId: string;
  name: string;
  category: string;
  price?: string | null;
  supplyPrice?: string | null;
  color?: string | null;
  description?: string | null;
  imageUrl: string;
  tryonImageUrl?: string | null;
  imageHash?: string | null;
  mood?: string | null;
  status?: Product["status"];
}) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for product creation.");
  return one<Product>(
    `INSERT INTO products (
       designer_id, name, category, price, supply_price, color, description, image_url, tryon_image_url, image_hash, mood, status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      input.designerId,
      input.name,
      input.category,
      input.price || null,
      input.supplyPrice || null,
      input.color || null,
      input.description || null,
      input.imageUrl,
      input.tryonImageUrl || null,
      input.imageHash || null,
      input.mood || null,
      input.status || "active",
    ],
  );
}

export async function updateProductForDesigner(designerId: string, productId: string, input: Partial<{
  name: string;
  category: string;
  price: string | null;
  supplyPrice: string | null;
  color: string | null;
  description: string | null;
  imageUrl: string;
  tryonImageUrl: string | null;
  imageHash: string | null;
  mood: string | null;
  status: Product["status"];
}>) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for product updates.");
  return one<Product>(
    `UPDATE products
     SET name = COALESCE($3, name),
         category = COALESCE($4, category),
         price = COALESCE($5, price),
         supply_price = COALESCE($6, supply_price),
         color = COALESCE($7, color),
         description = COALESCE($8, description),
         image_url = COALESCE($9, image_url),
         tryon_image_url = COALESCE($10, tryon_image_url),
         image_hash = COALESCE($11, image_hash),
         mood = COALESCE($12, mood),
         status = COALESCE($13, status),
         updated_at = now()
     WHERE designer_id = $1 AND id = $2
     RETURNING *`,
    [
      designerId,
      productId,
      input.name ?? null,
      input.category ?? null,
      input.price ?? null,
      input.supplyPrice ?? null,
      input.color ?? null,
      input.description ?? null,
      input.imageUrl ?? null,
      input.tryonImageUrl ?? null,
      input.imageHash ?? null,
      input.mood ?? null,
      input.status ?? null,
    ],
  );
}

export async function getModelTemplates(): Promise<ModelTemplate[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return toDemoModelTemplates();
  }
  try {
    return await query<ModelTemplate>("SELECT * FROM model_templates ORDER BY created_at ASC");
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return toDemoModelTemplates();
  }
}

export async function getModelTemplate(id: string): Promise<ModelTemplate | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return toDemoModelTemplates().find((template) => template.id === id) ?? toDemoModelTemplates()[0] ?? null;
  }
  return one<ModelTemplate>("SELECT * FROM model_templates WHERE id = $1", [id]);
}

export async function getGeneratedLooksForDesigner(designerId: string): Promise<GeneratedLook[]> {
  if (!hasDatabase()) return [];
  return query<GeneratedLook>(
    "SELECT * FROM generated_looks WHERE designer_id = $1 ORDER BY created_at DESC",
    [designerId],
  );
}

export async function getAdminDashboardStats() {
  if (!hasDatabase()) {
    return {
      designersTotal: 1,
      pendingDesigners: 0,
      approvedDesigners: 1,
      productsTotal: toDemoProducts().length,
      generatedLooksTotal: 0,
      liveGenerationsToday: 0,
    };
  }

  const [row] = await query<{
    designers_total: string;
    pending_designers: string;
    approved_designers: string;
    products_total: string;
    generated_looks_total: string;
    live_generations_today: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM designers) AS designers_total,
       (SELECT COUNT(*)::text FROM designers WHERE approval_status = 'pending') AS pending_designers,
       (SELECT COUNT(*)::text FROM designers WHERE approval_status = 'approved') AS approved_designers,
       (SELECT COUNT(*)::text FROM products WHERE status <> 'hidden') AS products_total,
       (SELECT COUNT(*)::text FROM generated_looks WHERE status <> 'hidden') AS generated_looks_total,
       (SELECT COUNT(*)::text
          FROM generation_logs
         WHERE cache_hit = false
           AND status = 'generated'
           AND created_at >= date_trunc('day', now())) AS live_generations_today`,
  );

  return {
    designersTotal: Number(row?.designers_total || 0),
    pendingDesigners: Number(row?.pending_designers || 0),
    approvedDesigners: Number(row?.approved_designers || 0),
    productsTotal: Number(row?.products_total || 0),
    generatedLooksTotal: Number(row?.generated_looks_total || 0),
    liveGenerationsToday: Number(row?.live_generations_today || 0),
  };
}

export type AdminGeneratedLook = GeneratedLook & {
  designer_brand_name: string | null;
};

export async function getGeneratedLooksForAdmin(limit = 80): Promise<AdminGeneratedLook[]> {
  if (!hasDatabase()) return [];
  return query<AdminGeneratedLook>(
    `SELECT generated_looks.*, designers.brand_name AS designer_brand_name
       FROM generated_looks
       LEFT JOIN designers ON designers.id = generated_looks.designer_id
      ORDER BY generated_looks.created_at DESC
      LIMIT $1`,
    [limit],
  );
}

export async function getGeneratedLookByCacheKey(cacheKey: string): Promise<GeneratedLook | null> {
  if (!hasDatabase()) return null;
  return one<GeneratedLook>(
    "SELECT * FROM generated_looks WHERE cache_key = $1 AND status <> 'hidden' ORDER BY created_at DESC LIMIT 1",
    [cacheKey],
  );
}

export async function getGeneratedLookForDesigner(designerId: string, id: string): Promise<GeneratedLook | null> {
  if (!hasDatabase()) return null;
  return one<GeneratedLook>(
    "SELECT * FROM generated_looks WHERE designer_id = $1 AND id = $2",
    [designerId, id],
  );
}

export async function createGeneratedLook(input: {
  designerId: string;
  modelTemplateId: string;
  selectedProductIds: string[];
  cacheKey: string;
  prompt: string;
  imageUrl: string;
  cacheHit?: boolean;
}) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for generated looks.");
  return one<GeneratedLook>(
    `INSERT INTO generated_looks (
       designer_id, model_template_id, selected_product_ids, cache_key, prompt, image_url, provider, cache_hit, status
     )
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, 'openai', $7, 'generated')
     RETURNING *`,
    [
      input.designerId,
      input.modelTemplateId,
      JSON.stringify(input.selectedProductIds),
      input.cacheKey,
      input.prompt,
      input.imageUrl,
      Boolean(input.cacheHit),
    ],
  );
}

export async function hideGeneratedLookForDesigner(designerId: string, id: string) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for generated look updates.");
  return one<GeneratedLook>(
    "UPDATE generated_looks SET status = 'hidden', updated_at = now() WHERE designer_id = $1 AND id = $2 RETURNING *",
    [designerId, id],
  );
}

export async function countDailyLiveGenerations(designerId: string) {
  if (!hasDatabase()) return 0;
  const row = await one<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM generation_logs
     WHERE designer_id = $1
       AND cache_hit = false
       AND status = 'generated'
       AND created_at >= date_trunc('day', now())`,
    [designerId],
  );
  return Number(row?.count || 0);
}

export async function createGenerationLog(input: {
  userId: string;
  designerId: string;
  provider: string;
  cacheKey?: string | null;
  cacheHit: boolean;
  status: string;
  errorMessage?: string | null;
}) {
  if (!hasDatabase()) return null;
  return one<{ id: string }>(
    `INSERT INTO generation_logs (user_id, designer_id, provider, cache_key, cache_hit, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.userId,
      input.designerId,
      input.provider,
      input.cacheKey || null,
      input.cacheHit,
      input.status,
      input.errorMessage || null,
    ],
  );
}

export async function getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
  const demoUser = () => {
    const now = new Date("2026-05-30T00:00:00Z").toISOString();
    const demoUsers: Array<User & { password_hash: string }> = [
      {
        id: "demo-admin-user",
        email: "admin",
        role: "admin",
        password_hash: "1234",
        created_at: now,
        updated_at: now,
      },
      {
        id: "demo-designer-user",
        email: "test",
        role: "designer",
        password_hash: "1234",
        created_at: now,
        updated_at: now,
      },
    ];
    return demoUsers.find((user) => user.email === email.toLowerCase()) ?? null;
  }
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return demoUser();
  }
  try {
    return await one<User & { password_hash: string }>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return demoUser();
  }
}

export async function getDesignerForUser(userId: string): Promise<Designer | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return userId === "demo-designer-user" ? toDemoDesigner() : null;
  }
  try {
    const designer = await one<Designer>("SELECT * FROM designers WHERE user_id = $1", [userId]);
    if (!designer && userId === "demo-designer-user") {
      await ensureEasyAccessAccounts();
      return await one<Designer>("SELECT * FROM designers WHERE user_id = $1", [userId]);
    }
    return designer;
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return userId === "demo-designer-user" ? toDemoDesigner() : null;
  }
}

export async function updateDesignerApprovalStatus(id: string, status: "approved" | "disabled") {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return toDemoDesigner();
  }
  return one<Designer>(
    "UPDATE designers SET approval_status = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, status],
  );
}

export async function updateDesignerProfile(id: string, input: Partial<{
  brand_name: string;
  description: string;
  mood: string;
  country: string;
}>) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for profile updates.");
  return one<Designer>(
    `UPDATE designers
     SET brand_name = COALESCE($2, brand_name),
         description = COALESCE($3, description),
         mood = COALESCE($4, mood),
         country = COALESCE($5, country),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, input.brand_name ?? null, input.description ?? null, input.mood ?? null, input.country ?? null],
  );
}
