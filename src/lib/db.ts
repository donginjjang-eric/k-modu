import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { QueryResultRow } from "pg";
import { designer as phaseDesigner, modelTemplates as phaseTemplates, products as phaseProducts } from "./phase1-data";
import type { ApprovalStatus, CollabRequest, CollabRequestStatus, CollabRequestType, Designer, DesignerPortfolioImage, GeneratedLook, ModelTemplate, PortfolioImageStatus, Product, User } from "./types";

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

export function toDemoDesigner(): Designer {
  const now = new Date("2026-05-30T00:00:00Z").toISOString();
  return {
    id: phaseDesigner.id,
    user_id: "demo-designer-user",
    brand_name: phaseDesigner.brandName,
    designer_name: "Han Seo Yoon",
    contact_email: "hello@maisonlune.co.kr",
    contact_phone: "",
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

export async function getApprovedDesigner(id: string): Promise<Designer | null> {
  const designer = await getDesigner(id);
  return designer && designer.approval_status === "approved" ? designer : null;
}

export function toDemoPortfolioImages(): DesignerPortfolioImage[] {
  const now = new Date("2026-05-30T00:00:00Z").toISOString();
  return [
    {
      id: "demo-profile-1",
      designer_id: phaseDesigner.id,
      title: "Maison Lune profile",
      kind: "profile",
      image_url: "assets/designer-samples/model_1.png",
      image_hash: "demo-profile-v1",
      status: "approved",
      created_at: now,
      updated_at: now,
    },
  ];
}

export async function createDesignerApplication(input: {
  brand_name: string;
  designer_name: string;
  contact_email: string;
  contact_phone: string;
  description?: string;
  mood?: string;
  country?: string;
  user_id?: string;
}) {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return toDemoDesigner();
  }

  return one<Designer>(
    `INSERT INTO designers
       (brand_name, designer_name, contact_email, contact_phone, description, mood, country, approval_status, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
     RETURNING *`,
    [
      input.brand_name,
      input.designer_name,
      input.contact_email,
      input.contact_phone,
      input.description ?? "",
      input.mood ?? "",
      input.country ?? "South Korea",
      input.user_id ?? null,
    ],
  );
}

// ── 크리에이터 의뢰 (샘플 요청 / 협업 제안) ──
export async function createCollabRequest(input: {
  designer_id: string;
  request_type: CollabRequestType;
  creator_name: string;
  creator_contact: string;
  message: string;
}): Promise<CollabRequest | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    const now = new Date().toISOString();
    return { id: "demo-collab-request", status: "new", created_at: now, updated_at: now, ...input };
  }
  return one<CollabRequest>(
    `INSERT INTO collab_requests (designer_id, request_type, creator_name, creator_contact, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.designer_id, input.request_type, input.creator_name, input.creator_contact, input.message],
  );
}

export async function getCollabRequestsForDesigner(designerId: string): Promise<CollabRequest[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return [];
  }
  return query<CollabRequest>(
    "SELECT * FROM collab_requests WHERE designer_id = $1 ORDER BY created_at DESC",
    [designerId],
  );
}

export async function updateCollabRequestStatus(
  id: string,
  designerId: string,
  status: CollabRequestStatus,
): Promise<CollabRequest | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  // designer_id 조건으로 본인 의뢰만 변경 가능
  return one<CollabRequest>(
    `UPDATE collab_requests SET status = $3, updated_at = now()
      WHERE id = $1 AND designer_id = $2
      RETURNING *`,
    [id, designerId, status],
  );
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

export async function getPublicProductsForDesigner(designerId: string): Promise<Product[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return designerId === phaseDesigner.id ? toDemoProducts().filter((product) => product.status === "active") : [];
  }
  try {
    // DB가 정상이면 DB가 유일한 진실. (과거에는 데모 상품을 합쳐 넣었지만,
    // 숨김 처리한 상품이 폴백으로 되살아나는 문제가 있어 제거 — 2026-06-12)
    return await query<Product>(
      "SELECT * FROM products WHERE designer_id = $1 AND status = 'active' ORDER BY created_at DESC",
      [designerId],
    );
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return designerId === phaseDesigner.id ? toDemoProducts().filter((product) => product.status === "active") : [];
  }
}

export async function getProductsForDesignerForAdmin(designerId: string): Promise<Product[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return designerId === phaseDesigner.id ? toDemoProducts() : [];
  }

  return query<Product>(
    "SELECT * FROM products WHERE designer_id = $1 ORDER BY created_at DESC",
    [designerId],
  );
}

export type AdminProduct = Product & {
  designer_brand_name: string | null;
  designer_approval_status: Designer["approval_status"] | null;
};

export async function getProductsForAdmin(limit = 120): Promise<AdminProduct[]> {
  if (!hasDatabase()) {
    return toDemoProducts().map((product) => ({
      ...product,
      designer_brand_name: phaseDesigner.brandName,
      designer_approval_status: "approved",
    }));
  }

  return query<AdminProduct>(
    `SELECT products.*,
            designers.brand_name AS designer_brand_name,
            designers.approval_status AS designer_approval_status
       FROM products
       LEFT JOIN designers ON designers.id = products.designer_id
      ORDER BY products.created_at DESC
      LIMIT $1`,
    [limit],
  );
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

export async function updateProductForAdmin(productId: string, input: Partial<{
  status: Product["status"];
}>) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for product updates.");
  return one<AdminProduct>(
    `UPDATE products
        SET status = COALESCE($2, status),
            updated_at = now()
      WHERE products.id = $1
      RETURNING products.*,
                (SELECT brand_name FROM designers WHERE designers.id = products.designer_id) AS designer_brand_name,
                (SELECT approval_status FROM designers WHERE designers.id = products.designer_id) AS designer_approval_status`,
    [productId, input.status ?? null],
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

export async function getPortfolioImagesForDesigner(designerId: string): Promise<DesignerPortfolioImage[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return designerId === phaseDesigner.id ? toDemoPortfolioImages() : [];
  }
  // 소유자 스튜디오용: 비공개(hidden) 포함 전체 조회 — 비공개 사진을 다시 공개로 되돌릴 수 있어야 한다
  return query<DesignerPortfolioImage>(
    "SELECT * FROM designer_portfolio_images WHERE designer_id = $1 ORDER BY created_at DESC",
    [designerId],
  );
}

export async function getApprovedPortfolioImagesForDesigner(designerId: string): Promise<DesignerPortfolioImage[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return designerId === phaseDesigner.id ? toDemoPortfolioImages().filter((image) => image.status === "approved") : [];
  }
  return query<DesignerPortfolioImage>(
    "SELECT * FROM designer_portfolio_images WHERE designer_id = $1 AND status = 'approved' ORDER BY updated_at DESC, created_at DESC",
    [designerId],
  );
}

export async function getApprovedPortfolioImagesForDesigners(designerIds: string[]): Promise<DesignerPortfolioImage[]> {
  if (!designerIds.length) return [];
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return designerIds.includes(phaseDesigner.id)
      ? toDemoPortfolioImages().filter((image) => image.status === "approved")
      : [];
  }
  return query<DesignerPortfolioImage>(
    `SELECT * FROM designer_portfolio_images
      WHERE designer_id = ANY($1::text[]) AND status = 'approved'
      ORDER BY designer_id, updated_at DESC, created_at DESC`,
    [designerIds],
  );
}

export async function createPortfolioImageForDesigner(input: {
  designerId: string;
  title: string;
  kind: DesignerPortfolioImage["kind"];
  imageUrl: string;
  imageHash?: string | null;
}) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for portfolio image creation.");
  return one<DesignerPortfolioImage>(
    `INSERT INTO designer_portfolio_images (designer_id, title, kind, image_url, image_hash, status)
     VALUES ($1, $2, $3, $4, $5, 'approved')
     RETURNING *`,
    [input.designerId, input.title, input.kind, input.imageUrl, input.imageHash || null],
  );
}

export async function updatePortfolioImageForDesigner(designerId: string, imageId: string, input: Partial<{
  title: string;
  kind: DesignerPortfolioImage["kind"];
  status: PortfolioImageStatus;
}>) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for portfolio image updates.");
  return one<DesignerPortfolioImage>(
    `UPDATE designer_portfolio_images
        SET title = COALESCE($3, title),
            kind = COALESCE($4, kind),
            status = COALESCE($5, status),
            updated_at = now()
      WHERE designer_id = $1 AND id = $2
      RETURNING *`,
    [designerId, imageId, input.title ?? null, input.kind ?? null, input.status ?? null],
  );
}

export async function updatePortfolioImageForAdmin(imageId: string, status: PortfolioImageStatus) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for portfolio image updates.");
  return one<DesignerPortfolioImage>(
    `UPDATE designer_portfolio_images
        SET status = $2,
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [imageId, status],
  );
}

export async function getPublicProductsForGeneration(designerId: string, productIds: string[]): Promise<Product[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return toDemoProducts().filter((product) => (
      product.designer_id === designerId && productIds.includes(product.id) && product.status === "active"
    ));
  }
  const products = await query<Product>(
    "SELECT * FROM products WHERE designer_id = $1 AND id = ANY($2::text[]) AND status = 'active'",
    [designerId, productIds],
  );
  if (products.length !== new Set(productIds).size && designerId === phaseDesigner.id) {
    const existingIds = new Set(products.map((product) => product.id));
    const fallbackProducts = toDemoProducts().filter((product) => (
      product.designer_id === designerId
      && productIds.includes(product.id)
      && product.status === "active"
      && !existingIds.has(product.id)
    ));
    return [...products, ...fallbackProducts];
  }
  return products;
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

export async function getApprovedGeneratedLooksForDesigner(designerId: string, limit = 12): Promise<GeneratedLook[]> {
  if (!hasDatabase()) return [];
  return query<GeneratedLook>(
    `SELECT * FROM generated_looks
      WHERE designer_id = $1
        AND status = 'approved'
      ORDER BY updated_at DESC, created_at DESC
      LIMIT $2`,
    [designerId, limit],
  );
}

export async function getApprovedGeneratedLooksForPublic(limit = 12): Promise<AdminGeneratedLook[]> {
  if (!hasDatabase()) return [];
  return query<AdminGeneratedLook>(
    `SELECT generated_looks.*, designers.brand_name AS designer_brand_name
       FROM generated_looks
       LEFT JOIN designers ON designers.id = generated_looks.designer_id
      WHERE generated_looks.status = 'approved'
      ORDER BY generated_looks.updated_at DESC, generated_looks.created_at DESC
      LIMIT $1`,
    [limit],
  );
}

export async function getAdminDashboardStats() {
  if (!hasDatabase()) {
    return {
      usersTotal: 1,
      designersTotal: 1,
      pendingDesigners: 0,
      approvedDesigners: 1,
      productsTotal: toDemoProducts().length,
      generatedLooksTotal: 0,
      liveGenerationsToday: 0,
    };
  }

  const [row] = await query<{
    users_total: string;
    designers_total: string;
    pending_designers: string;
    approved_designers: string;
    products_total: string;
    generated_looks_total: string;
    live_generations_today: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM users) AS users_total,
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
    usersTotal: Number(row?.users_total || 0),
    designersTotal: Number(row?.designers_total || 0),
    pendingDesigners: Number(row?.pending_designers || 0),
    approvedDesigners: Number(row?.approved_designers || 0),
    productsTotal: Number(row?.products_total || 0),
    generatedLooksTotal: Number(row?.generated_looks_total || 0),
    liveGenerationsToday: Number(row?.live_generations_today || 0),
  };
}

// 관리자 회원 목록: 가입 계정 + 연결된 디자이너 프로필 (신청 전 가입자도 보이도록 LEFT JOIN)
export type AdminUserRow = Pick<User, "id" | "email" | "role" | "created_at"> & {
  designer_id: string | null;
  brand_name: string | null;
  approval_status: ApprovalStatus | null;
};

export async function getAllUsersWithDesigner(): Promise<AdminUserRow[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return [];
  }
  return query<AdminUserRow>(
    `SELECT users.id, users.email, users.role, users.created_at,
            designers.id AS designer_id, designers.brand_name, designers.approval_status
       FROM users
       LEFT JOIN designers ON designers.user_id = users.id
      ORDER BY users.created_at DESC`,
  );
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

export async function getGeneratedLookByCacheKeyForDesigner(designerId: string, cacheKey: string): Promise<GeneratedLook | null> {
  if (!hasDatabase()) return null;
  return one<GeneratedLook>(
    "SELECT * FROM generated_looks WHERE designer_id = $1 AND cache_key = $2 ORDER BY created_at DESC LIMIT 1",
    [designerId, cacheKey],
  );
}

export async function getGeneratedLookForDesigner(designerId: string, id: string): Promise<GeneratedLook | null> {
  if (!hasDatabase()) return null;
  return one<GeneratedLook>(
    "SELECT * FROM generated_looks WHERE designer_id = $1 AND id = $2",
    [designerId, id],
  );
}

export async function updateGeneratedLookForDesigner(designerId: string, id: string, input: { status: GeneratedLook["status"] }) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for generated look updates.");
  return one<GeneratedLook>(
    `UPDATE generated_looks
        SET status = $3,
            updated_at = now()
      WHERE designer_id = $1
        AND id = $2
      RETURNING *`,
    [designerId, id, input.status],
  );
}

export async function updateGeneratedLookForAdmin(id: string, input: { status: GeneratedLook["status"] }) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for generated look updates.");
  return one<AdminGeneratedLook>(
    `UPDATE generated_looks
        SET status = $2,
            updated_at = now()
      WHERE generated_looks.id = $1
      RETURNING generated_looks.*,
                (SELECT brand_name FROM designers WHERE designers.id = generated_looks.designer_id) AS designer_brand_name`,
    [id, input.status],
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
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, 'openai', $7, 'hidden')
     ON CONFLICT (cache_key) WHERE status <> 'hidden' DO UPDATE
       SET updated_at = now()
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
  userId: string | null;
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

export async function getLatestGenerationLogForDesigner(designerId: string, cacheKey: string) {
  if (!hasDatabase()) return null;
  return one<{
    id: string;
    status: string;
    error_message: string | null;
    created_at: string;
  }>(
    `SELECT id, status, error_message, created_at
       FROM generation_logs
      WHERE designer_id = $1
        AND cache_key = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [designerId, cacheKey],
  );
}

export async function getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  try {
    return await one<User & { password_hash: string }>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return null;
  }
}

// 같은 이메일로 제출된 미연결 디자이너 신청서를 이 사용자에 연결한다.
// (스키마는 부팅 시 scripts/ensure-schema.mjs가 보장한다)
async function linkDesignerByEmail(userId: string, email: string): Promise<Designer | null> {
  return one<Designer>(
    `UPDATE designers
        SET user_id = $1, updated_at = now()
      WHERE id = (
        SELECT id FROM designers
         WHERE lower(contact_email) = $2 AND user_id IS NULL
         ORDER BY created_at DESC
         LIMIT 1
      )
      RETURNING *`,
    [userId, email],
  );
}

// 구글 로그인 사용자 조회/생성. 디자이너 등록은 신청 페이지(/apply)의 역할이므로
// 여기서는 프로필을 만들지 않고, 신청서 이메일이 일치하면 연결만 한다.
export async function findOrCreateGoogleUser(email: string): Promise<{ user: User; designer: Designer | null }> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    const now = new Date().toISOString();
    return {
      user: { id: "demo-designer-user", email, role: "designer", created_at: now, updated_at: now },
      designer: toDemoDesigner(),
    };
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    let designer = await getDesignerForUser(existing.id);
    // 구글 로그인 후 신청서를 낸 경우: 다음 로그인에서 이메일로 연결 (관리자도 디자이너 프로필을 가질 수 있다)
    if (!designer && (existing.role === "designer" || existing.role === "admin")) {
      designer = await linkDesignerByEmail(existing.id, email);
    }
    return { user: existing, designer };
  }

  // 구글 전용 계정: 'oauth:' + 랜덤값은 어떤 비밀번호와도 일치하지 않아 비밀번호 로그인이 차단된다.
  const userId = randomUUID();
  const user = await one<User>(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, $2, $3, 'designer')
     RETURNING id, email, role, created_at, updated_at`,
    [userId, email, `oauth:${randomBytes(32).toString("base64url")}`],
  );
  if (!user) throw new Error("Failed to create Google user.");

  const designer = await linkDesignerByEmail(userId, email);
  return { user, designer };
}

export async function getDesignerForUser(userId: string): Promise<Designer | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  try {
    return await one<Designer>("SELECT * FROM designers WHERE user_id = $1", [userId]);
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return null;
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
