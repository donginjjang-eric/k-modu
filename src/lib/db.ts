import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import type { PoolClient, QueryResultRow } from "pg";
import { designer as phaseDesigner, modelTemplates as phaseTemplates, products as phaseProducts } from "./phase1-data";
import { summarizeCreatorSettlementRewards, toCreatorSettlementItems } from "./creator-rewards";
import type { CreatorRewardSummary, CreatorSettlementItem, CreatorSettlementLedgerRow } from "./creator-rewards";
import type { ApprovalStatus, CampaignEvent, CampaignParticipation, CampaignPerformance, CollabRequest, CollabRequestStatus, CollabRequestType, ContentSubmission, CreatorAccount, CreatorCollabProposal, CreatorProposalStatus, CreatorProposalType, Designer, DesignerPortfolioImage, GeneratedLook, Lookbook, LookbookItem, LookbookLayout, ModelTemplate, PortfolioImageStatus, Product, Role, User, UserWorkspaceMembership } from "./types";
import type { PartnerWorkspaceType } from "./partner-workspace-access";
import { normalizeProductImages } from "./product-images";
import { initialProductApprovalStatus } from "./product-approval";
import { normalizeProductDetailImages } from "./product-detail-images";

let pool: Pool | null = null;

export type DatabaseTransactionClient = PoolClient;

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

export async function withDatabaseTransaction<T>(operation: (client: DatabaseTransactionClient) => Promise<T>): Promise<T> {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
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
    brand_category: "K-패션",
    mood: phaseDesigner.mood,
    country: phaseDesigner.country,
    logo_url: null,
    approval_status: "approved",
    daily_generation_limit: 20,
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
    image_urls: [product.image],
    detail_image_urls: [],
    tryon_image_url: null,
    image_hash: `${product.id}-demo-v1`,
    mood: phaseDesigner.mood,
    status: "active",
    approval_status: "approved",
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

export type PublicDesignerCounts = {
  products: number;
  designers: number;
  generatedLooks: number;
};

// Public designer-board KPIs in one indexed query. The supplied IDs are the
// already-approved designers returned by getPublicDesigners(), so the totals
// stay scoped to the brands that can actually appear on the public board.
export async function getPublicDesignerCounts(designerIds: string[]): Promise<PublicDesignerCounts> {
  const fallback = {
    products: designerIds.includes(phaseDesigner.id)
      ? toDemoProducts().filter((product) => product.status === "active").length
      : 0,
    designers: designerIds.length,
    generatedLooks: 0,
  };

  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return fallback;
  }

  try {
    const row = await one<{ product_count: string; generated_look_count: string }>(
      `SELECT
         (SELECT COUNT(*)::text
            FROM products
           WHERE designer_id = ANY($1::text[])
             AND status = 'active') AS product_count,
         (SELECT COUNT(*)::text
            FROM generated_looks
           WHERE designer_id = ANY($1::text[])
             AND status = 'approved') AS generated_look_count`,
      [designerIds],
    );

    return {
      products: Number(row?.product_count || 0),
      designers: designerIds.length,
      generatedLooks: Number(row?.generated_look_count || 0),
    };
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return fallback;
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
  brand_category: string;
  mood?: string;
  country?: string;
  user_id?: string;
}) {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return toDemoDesigner();
  }

  // 오픈 정책: 신청 즉시 자동 승인해 디자이너가 바로 스튜디오를 쓸 수 있게 한다.
  // 다시 수동 승인으로 돌리려면 AUTO_APPROVE_DESIGNERS=false 로 설정.
  const initialStatus = process.env.AUTO_APPROVE_DESIGNERS === "false" ? "pending" : "approved";
  return one<Designer>(
    `INSERT INTO designers
       (brand_name, designer_name, contact_email, contact_phone, description, brand_category, mood, country, approval_status, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, '', $7, $8, $9)
     RETURNING *`,
    [
      input.brand_name,
      input.designer_name,
      input.contact_email,
      input.contact_phone,
      input.description ?? "",
      input.brand_category,
      input.country ?? "South Korea",
      initialStatus,
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

// ── 브랜드 → 큐레이션 크리에이터 협업 제안 ──
export async function createCreatorCollabProposal(input: {
  requester_user_id?: string | null;
  creator_key: string;
  creator_name: string;
  creator_platform: string;
  creator_market: string;
  brand_name: string;
  requester_name: string;
  requester_contact: string;
  proposal_type: CreatorProposalType;
  budget: string;
  message: string;
}): Promise<CreatorCollabProposal | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    const now = new Date().toISOString();
    return {
      ...input,
      id: `demo-creator-proposal-${Date.now()}`,
      requester_user_id: input.requester_user_id ?? null,
      status: "new",
      created_at: now,
      updated_at: now,
    };
  }

  return one<CreatorCollabProposal>(
    `INSERT INTO creator_collab_proposals
       (requester_user_id, creator_key, creator_name, creator_platform, creator_market,
        brand_name, requester_name, requester_contact, proposal_type, budget, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      input.requester_user_id ?? null,
      input.creator_key,
      input.creator_name,
      input.creator_platform,
      input.creator_market,
      input.brand_name,
      input.requester_name,
      input.requester_contact,
      input.proposal_type,
      input.budget,
      input.message,
    ],
  );
}

export async function getCreatorCollabProposalsForAdmin(): Promise<CreatorCollabProposal[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return [];
  }
  return query<CreatorCollabProposal>(
    `SELECT * FROM creator_collab_proposals
      ORDER BY CASE status
        WHEN 'new' THEN 0
        WHEN 'contacted' THEN 1
        WHEN 'negotiating' THEN 2
        WHEN 'matched' THEN 3
        ELSE 4
      END, created_at DESC`,
  );
}

export async function updateCreatorCollabProposalStatus(
  id: string,
  status: CreatorProposalStatus,
): Promise<CreatorCollabProposal | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  return one<CreatorCollabProposal>(
    `UPDATE creator_collab_proposals
        SET status = $2, updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [id, status],
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
      "SELECT * FROM products WHERE designer_id = $1 AND status = 'active' AND approval_status = 'approved' ORDER BY created_at DESC",
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

export async function getProductsForAdmin(): Promise<AdminProduct[]> {
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
      ORDER BY products.created_at DESC`,
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
  approvalStatus: ApprovalStatus;
  reason: string;
}>, actorUserId?: string) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for product updates.");
  return withDatabaseTransaction(async (client) => {
    const updated = await client.query<AdminProduct>(`UPDATE products
        SET status = COALESCE($2, status),
            approval_status = COALESCE($3, approval_status),
            moderation_reason = CASE WHEN $3 = 'disabled' THEN $4 WHEN $3 = 'approved' THEN NULL ELSE moderation_reason END,
            updated_at = now()
      WHERE products.id = $1
      RETURNING products.*,
                (SELECT brand_name FROM designers WHERE designers.id = products.designer_id) AS designer_brand_name,
                (SELECT approval_status FROM designers WHERE designers.id = products.designer_id) AS designer_approval_status`,
      [productId, input.status ?? null, input.approvalStatus ?? null, input.reason ?? null]);
    const product = updated.rows[0] ?? null;
    if (product && actorUserId) {
      await client.query(
        `INSERT INTO creator_management_audit_logs (actor_user_id, action, metadata)
         VALUES ($1, 'admin_product_status_changed', $2::jsonb)`,
        [actorUserId, JSON.stringify({ productId, status: input.status, approvalStatus: input.approvalStatus, reason: input.reason || "" })],
      );
    }
    return product;
  });
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
    "SELECT * FROM products WHERE designer_id = $1 AND id = ANY($2::text[]) AND status = 'active' AND approval_status = 'approved'",
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
  imageUrls?: string[];
  detailImageUrls?: string[];
  tryonImageUrl?: string | null;
  imageHash?: string | null;
  mood?: string | null;
  status?: Product["status"];
  approvalStatus?: ApprovalStatus;
}) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for product creation.");
  const imageUrls = normalizeProductImages(input.imageUrls, input.imageUrl);
  const detailImageUrls = normalizeProductDetailImages(input.detailImageUrls);
  return one<Product>(
    `INSERT INTO products (
       designer_id, name, category, price, supply_price, color, description, image_url, image_urls, detail_image_urls, tryon_image_url, image_hash, mood, status, approval_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      input.designerId,
      input.name,
      input.category,
      input.price || null,
      input.supplyPrice || null,
      input.color || null,
      input.description || null,
      imageUrls[0],
      JSON.stringify(imageUrls),
      JSON.stringify(detailImageUrls),
      input.tryonImageUrl || null,
      input.imageHash || null,
      input.mood || null,
      input.status || "active",
      input.approvalStatus || initialProductApprovalStatus(process.env.AUTO_APPROVE_PRODUCTS),
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
  imageUrls: string[];
  detailImageUrls: string[];
  tryonImageUrl: string | null;
  imageHash: string | null;
  mood: string | null;
  status: Product["status"];
}>) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for product updates.");
  const imageUrls = input.imageUrls === undefined ? undefined : normalizeProductImages(input.imageUrls, input.imageUrl);
  const detailImageUrls = input.detailImageUrls === undefined ? undefined : normalizeProductDetailImages(input.detailImageUrls);
  return one<Product>(
    `UPDATE products
     SET name = COALESCE($3, name),
         category = COALESCE($4, category),
         price = COALESCE($5, price),
         supply_price = COALESCE($6, supply_price),
         color = COALESCE($7, color),
         description = COALESCE($8, description),
         image_url = COALESCE($9, image_url),
         image_urls = COALESCE($10::jsonb, image_urls),
         detail_image_urls = COALESCE($11::jsonb, detail_image_urls),
         tryon_image_url = COALESCE($12, tryon_image_url),
         image_hash = COALESCE($13, image_hash),
         mood = COALESCE($14, mood),
         status = COALESCE($15, status),
         updated_at = now()
     WHERE designer_id = $1 AND id = $2 AND approval_status <> 'disabled'
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
      imageUrls?.[0] ?? input.imageUrl ?? null,
      imageUrls ? JSON.stringify(imageUrls) : null,
      detailImageUrls ? JSON.stringify(detailImageUrls) : null,
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
      creatorsTotal: 0,
      designersTotal: 1,
      pendingCreators: 0,
      pendingDesigners: 0,
      approvedDesigners: 1,
      pendingProducts: toDemoProducts().filter((product) => product.status === "draft").length,
      productsTotal: toDemoProducts().length,
      pendingGeneratedLooks: 0,
      generatedLooksTotal: 0,
      liveGenerationsToday: 0,
      signupsToday: 0,
      signupsWeek: 0,
      aiGenerationsWeek: 0,
      creatorProposalsNew: 0,
      creatorProposalsTotal: 0,
    };
  }

  const [row] = await query<{
    users_total: string;
    creators_total: string;
    designers_total: string;
    pending_creators: string;
    pending_designers: string;
    approved_designers: string;
    pending_products: string;
    products_total: string;
    pending_generated_looks: string;
    generated_looks_total: string;
    live_generations_today: string;
    signups_today: string;
    signups_week: string;
    ai_generations_week: string;
    creator_proposals_new: string;
    creator_proposals_total: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM users) AS users_total,
       (SELECT COUNT(*)::text FROM creator_accounts WHERE user_id IS NOT NULL) AS creators_total,
       (SELECT COUNT(*)::text FROM designers) AS designers_total,
       (SELECT COUNT(*)::text
          FROM creator_accounts
         WHERE approval_status = 'pending'
           AND onboarding_source = 'self_registered'
           AND user_id IS NOT NULL) AS pending_creators,
       (SELECT COUNT(*)::text FROM designers WHERE approval_status = 'pending') AS pending_designers,
       (SELECT COUNT(*)::text FROM designers WHERE approval_status = 'approved') AS approved_designers,
       (SELECT COUNT(*)::text FROM products WHERE status = 'draft') AS pending_products,
       (SELECT COUNT(*)::text FROM products WHERE status <> 'hidden') AS products_total,
       (SELECT COUNT(*)::text FROM generated_looks WHERE status = 'generated') AS pending_generated_looks,
       (SELECT COUNT(*)::text FROM generated_looks WHERE status <> 'hidden') AS generated_looks_total,
       (SELECT COUNT(*)::text
          FROM generation_logs
         WHERE cache_hit = false AND status = 'generated'
           AND created_at >= date_trunc('day', now())) AS live_generations_today,
       (SELECT COUNT(*)::text FROM users WHERE created_at >= date_trunc('day', now())) AS signups_today,
       (SELECT COUNT(*)::text FROM users WHERE created_at >= now() - interval '7 days') AS signups_week,
       (SELECT COUNT(*)::text
          FROM generation_logs
         WHERE cache_hit = false AND status = 'generated'
           AND created_at >= now() - interval '7 days') AS ai_generations_week,
       (SELECT COUNT(*)::text FROM creator_collab_proposals WHERE status = 'new') AS creator_proposals_new,
       (SELECT COUNT(*)::text FROM creator_collab_proposals) AS creator_proposals_total`,
  );

  return {
    usersTotal: Number(row?.users_total || 0),
    creatorsTotal: Number(row?.creators_total || 0),
    designersTotal: Number(row?.designers_total || 0),
    pendingCreators: Number(row?.pending_creators || 0),
    pendingDesigners: Number(row?.pending_designers || 0),
    approvedDesigners: Number(row?.approved_designers || 0),
    pendingProducts: Number(row?.pending_products || 0),
    productsTotal: Number(row?.products_total || 0),
    pendingGeneratedLooks: Number(row?.pending_generated_looks || 0),
    generatedLooksTotal: Number(row?.generated_looks_total || 0),
    liveGenerationsToday: Number(row?.live_generations_today || 0),
    signupsToday: Number(row?.signups_today || 0),
    signupsWeek: Number(row?.signups_week || 0),
    aiGenerationsWeek: Number(row?.ai_generations_week || 0),
    creatorProposalsNew: Number(row?.creator_proposals_new || 0),
    creatorProposalsTotal: Number(row?.creator_proposals_total || 0),
  };
}

// 관리자 메뉴 뱃지용 처리 대기 카운트 (레이아웃에서 매 요청 조회 — 가볍게 유지)
export async function getAdminPendingCounts() {
  if (!hasDatabase()) {
    return { pendingDesigners: 0, pendingLooks: 0, newCreatorProposals: 0 };
  }
  const [row] = await query<{ pending_designers: string; pending_looks: string; new_creator_proposals: string }>(
    `SELECT
       (SELECT COUNT(*)::text FROM designers WHERE approval_status = 'pending') AS pending_designers,
       (SELECT COUNT(*)::text FROM generated_looks WHERE status = 'generated') AS pending_looks,
       (SELECT COUNT(*)::text FROM creator_collab_proposals WHERE status = 'new') AS new_creator_proposals`,
  );
  return {
    pendingDesigners: Number(row?.pending_designers || 0),
    pendingLooks: Number(row?.pending_looks || 0),
    newCreatorProposals: Number(row?.new_creator_proposals || 0),
  };
}

// 관리자 회원 목록: 가입 계정 + 연결된 크리에이터·디자이너 프로필
export type AdminUserRow = Pick<User, "id" | "email" | "role" | "created_at"> & {
  designer_id: string | null;
  brand_name: string | null;
  designer_approval_status: ApprovalStatus | null;
  creator_id: string | null;
  creator_key: string | null;
  creator_name: string | null;
  creator_approval_status: ApprovalStatus | null;
  creator_platform: string | null;
  creator_market: string | null;
  creator_categories: string[] | null;
  creator_instagram_url: string | null;
  creator_tiktok_url: string | null;
  designer_name: string | null;
  designer_country: string | null;
  designer_description: string | null;
};

export async function getAllUsersWithDesigner(): Promise<AdminUserRow[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return [];
  }
  return query<AdminUserRow>(
    `SELECT users.id, users.email, users.role, users.created_at,
            designer_match.id AS designer_id, designer_match.brand_name,
            designer_match.approval_status AS designer_approval_status,
            designer_match.designer_name, designer_match.country AS designer_country,
            designer_match.description AS designer_description,
            creator_match.id AS creator_id, creator_match.creator_key,
            creator_match.display_name AS creator_name,
            creator_match.approval_status AS creator_approval_status,
            creator_match.platform AS creator_platform, creator_match.market AS creator_market,
            creator_match.categories AS creator_categories,
            creator_match.instagram_url AS creator_instagram_url,
            creator_match.tiktok_url AS creator_tiktok_url
       FROM users
       LEFT JOIN LATERAL (
         SELECT designers.id, designers.brand_name, designers.approval_status,
                designers.designer_name, designers.country, designers.description
           FROM designers
          WHERE designers.user_id = users.id
             OR (designers.user_id IS NULL AND lower(designers.contact_email) = lower(users.email))
          ORDER BY
            CASE WHEN designers.user_id = users.id THEN 0 ELSE 1 END,
            designers.created_at DESC
          LIMIT 1
       ) designer_match ON true
       LEFT JOIN LATERAL (
         SELECT creator_accounts.id, creator_accounts.creator_key, creator_accounts.display_name, creator_accounts.approval_status,
                creator_accounts.platform, creator_accounts.market, creator_accounts.categories,
                creator_accounts.instagram_url, creator_accounts.tiktok_url
           FROM creator_accounts
          WHERE creator_accounts.user_id = users.id
             OR lower(creator_accounts.google_email) = lower(users.email)
          ORDER BY
            CASE WHEN creator_accounts.user_id = users.id THEN 0 ELSE 1 END,
            creator_accounts.created_at DESC
          LIMIT 1
       ) creator_match ON true
      ORDER BY users.created_at DESC`,
  );
}

export type AdminGeneratedLook = GeneratedLook & {
  designer_brand_name: string | null;
};

export async function getGeneratedLooksForAdmin(): Promise<AdminGeneratedLook[]> {
  if (!hasDatabase()) return [];
  return query<AdminGeneratedLook>(
    `SELECT generated_looks.*, designers.brand_name AS designer_brand_name
      FROM generated_looks
      LEFT JOIN designers ON designers.id = generated_looks.designer_id
      ORDER BY generated_looks.created_at DESC`,
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

export async function deleteGeneratedLook(id: string): Promise<boolean> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for generated look deletion.");
  // DB 행만 삭제 — 버킷 이미지는 부팅 정리 스크립트가 고아 객체로 회수한다
  const deleted = await one<{ id: string }>("DELETE FROM generated_looks WHERE id = $1 RETURNING id", [id]);
  return Boolean(deleted);
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

export async function getGeneratedLookById(id: string): Promise<GeneratedLook | null> {
  if (!hasDatabase()) return null;
  return one<GeneratedLook>("SELECT * FROM generated_looks WHERE id = $1", [id]);
}

// Veo 영상 생성 상태/URL 갱신 (워커는 자체 pg로 직접 쓰고, API는 queued 진입 시 이걸로 표시)
export async function setGeneratedLookVideo(
  id: string,
  input: { status: GeneratedLook["video_status"]; url?: string | null },
): Promise<GeneratedLook | null> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for video updates.");
  return one<GeneratedLook>(
    `UPDATE generated_looks
        SET video_status = $2,
            video_url = COALESCE($3, video_url),
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [id, input.status, input.url ?? null],
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

// 전역 일일 실제 생성 합계 (비용 안전망용 — 모든 디자이너 합산)
export async function countDailyLiveGenerationsAll() {
  if (!hasDatabase()) return 0;
  const row = await one<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM generation_logs
     WHERE cache_hit = false
       AND status = 'generated'
       AND created_at >= date_trunc('day', now())`,
  );
  return Number(row?.count || 0);
}

// 디자이너별 오늘 Veo 숏폼 생성수 (완료 + 진행중) — 1일 한도 산정용. 실패는 재시도 가능하도록 미포함.
export async function countDailyVeoForDesigner(designerId: string) {
  if (!hasDatabase()) return 0;
  const row = await one<{ count: string }>(
    `SELECT (
        (SELECT COUNT(*) FROM generation_logs
           WHERE designer_id = $1 AND provider IN ('google-veo', 'fal-kling') AND status = 'generated'
             AND created_at >= date_trunc('day', now()))
      + (SELECT COUNT(*) FROM generated_looks
           WHERE designer_id = $1 AND video_status IN ('queued', 'processing'))
     )::text AS count`,
    [designerId],
  );
  return Number(row?.count || 0);
}

// 전역 오늘 Veo 숏폼 생성수 (비용 안전망 — 모든 디자이너 합산, 완료 + 진행중)
export async function countDailyVeoAll() {
  if (!hasDatabase()) return 0;
  const row = await one<{ count: string }>(
    `SELECT (
        (SELECT COUNT(*) FROM generation_logs
           WHERE provider IN ('google-veo', 'fal-kling') AND status = 'generated'
             AND created_at >= date_trunc('day', now()))
      + (SELECT COUNT(*) FROM generated_looks
           WHERE video_status IN ('queued', 'processing'))
     )::text AS count`,
  );
  return Number(row?.count || 0);
}

// 관리자: 승인 디자이너별 오늘 실제 생성수 + 일일 한도 (생성 비용 모니터링/조정용)
export async function getDesignerGenerationUsage(): Promise<Array<{
  id: string;
  brand_name: string;
  approval_status: ApprovalStatus;
  daily_generation_limit: number;
  today_count: number;
}>> {
  if (!hasDatabase()) return [];
  const rows = await query<{
    id: string;
    brand_name: string;
    approval_status: ApprovalStatus;
    daily_generation_limit: number;
    today_count: string;
  }>(
    `SELECT d.id, d.brand_name, d.approval_status, d.daily_generation_limit,
            COALESCE(g.cnt, 0)::text AS today_count
       FROM designers d
       LEFT JOIN (
         SELECT designer_id, COUNT(*) AS cnt
           FROM generation_logs
          WHERE cache_hit = false AND status = 'generated'
            AND created_at >= date_trunc('day', now())
          GROUP BY designer_id
       ) g ON g.designer_id = d.id
      WHERE d.approval_status = 'approved'
      ORDER BY COALESCE(g.cnt, 0) DESC, d.brand_name ASC`,
  );
  return rows.map((r) => ({ ...r, today_count: Number(r.today_count || 0) }));
}

// 관리자 대시보드: 일별/주별 AI 생성 사용량 개요 (최근 7일 추세 포함)
export async function getGenerationUsageOverview(): Promise<{
  today: number;
  week: number;
  daily: Array<{ date: string; count: number }>;
}> {
  if (!hasDatabase()) return { today: 0, week: 0, daily: [] };
  const rows = await query<{ day: string; count: string }>(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*) AS count
       FROM generation_logs
      WHERE cache_hit = false AND status = 'generated'
        AND created_at >= date_trunc('day', now()) - interval '6 days'
      GROUP BY 1
      ORDER BY 1`,
  );
  const counts = new Map(rows.map((r) => [r.day, Number(r.count || 0)]));
  // 오늘 기준 최근 7일을 빠짐없이 채운다 (생성 0인 날도 막대로 보이게)
  const daily: Array<{ date: string; count: number }> = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const dayRow = await one<{ day: string }>(
      `SELECT to_char(date_trunc('day', now()) - ($1 || ' days')::interval, 'YYYY-MM-DD') AS day`,
      [offset],
    );
    const date = dayRow?.day || "";
    daily.push({ date, count: counts.get(date) || 0 });
  }
  const week = daily.reduce((sum, d) => sum + d.count, 0);
  const today = daily.length ? daily[daily.length - 1].count : 0;
  return { today, week, daily };
}

export async function setDesignerDailyLimit(designerId: string, limit: number): Promise<Designer | null> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required to update generation limit.");
  const safe = Math.max(0, Math.min(1000, Math.round(limit)));
  return one<Designer>(
    "UPDATE designers SET daily_generation_limit = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [designerId, safe],
  );
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

// 세션 토큰은 무상태(쿠키) — 계정이 삭제되면 토큰은 남아도 유저는 없다. 실제 존재 확인용.
export async function getUserById(id: string): Promise<User | null> {
  if (!hasDatabase()) return null;
  try {
    return await one<User>("SELECT id, email, role, created_at FROM users WHERE id = $1", [id]);
  } catch {
    return null;
  }
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

export async function ensureMasterAdminRole(_userId: string, email: string): Promise<User | null> {
  if (!hasDatabase()) return null;
  return one<User>(
    `UPDATE users
        SET role = 'admin', updated_at = now()
      WHERE lower(email) = lower($1)
      RETURNING id, email, role, created_at, updated_at`,
    [email],
  );
}

// 같은 이메일로 제출된 미연결 디자이너 신청서를 이 사용자에 연결한다.
// (스키마는 부팅 시 scripts/ensure-schema.mjs가 보장한다)
export async function getCreatorAccountForUser(userId: string): Promise<CreatorAccount | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  try {
    return await one<CreatorAccount>("SELECT * FROM creator_accounts WHERE user_id = $1", [userId]);
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return null;
  }
}

export async function getOrCreateAdminCreatorAccount(userId: string, email: string): Promise<CreatorAccount | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  try {
    return await one<CreatorAccount>(
      `WITH updated AS (
         UPDATE creator_accounts
            SET user_id = $1,
                creator_key = $2,
                display_name = 'K-MODU 운영자',
                google_email = $3,
                approval_status = 'approved',
                platform = 'K-MODU',
                market = 'South Korea',
                categories = $4::jsonb,
                updated_at = now()
          WHERE user_id = $1 OR creator_key = $2
          RETURNING *
       ), inserted AS (
         INSERT INTO creator_accounts
           (user_id, creator_key, display_name, google_email, approval_status, platform, market, categories)
         SELECT $1, $2, 'K-MODU 운영자', $3, 'approved', 'K-MODU', 'South Korea', $4::jsonb
          WHERE NOT EXISTS (SELECT 1 FROM updated)
         ON CONFLICT (creator_key) DO UPDATE
           SET user_id = EXCLUDED.user_id,
               display_name = EXCLUDED.display_name,
               google_email = EXCLUDED.google_email,
               approval_status = 'approved',
               platform = EXCLUDED.platform,
               market = EXCLUDED.market,
               categories = EXCLUDED.categories,
               updated_at = now()
         RETURNING *
       )
       SELECT * FROM updated
       UNION ALL
       SELECT * FROM inserted
       LIMIT 1`,
      [userId, `admin-operator-${userId}`, email.trim().toLowerCase(), JSON.stringify(["fashion", "beauty", "operations"])],
    );
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return null;
  }
}

export async function getOrCreateAdminDesignerAccount(userId: string, email: string): Promise<Designer | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return toDemoDesigner();
  }
  return one<Designer>(
    `WITH existing AS (
       SELECT * FROM designers WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1
     ), inserted AS (
       INSERT INTO designers
         (user_id, brand_name, designer_name, contact_email, contact_phone, description, mood, country, approval_status)
       SELECT $1, 'K-MODU MASTER STUDIO', 'K-MODU 운영자', $2, '', '마스터 관리자용 디자이너 스튜디오', 'K-Fashion', 'South Korea', 'approved'
        WHERE NOT EXISTS (SELECT 1 FROM existing)
       RETURNING *
     )
     SELECT * FROM existing
     UNION ALL
     SELECT * FROM inserted
     LIMIT 1`,
    [userId, email.trim().toLowerCase()],
  );
}

export async function getApprovedCreatorAccountForAdminPreview(): Promise<CreatorAccount | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  try {
    const approved = await one<CreatorAccount>(
      "SELECT * FROM creator_accounts WHERE approval_status = 'approved' ORDER BY display_name ASC LIMIT 1",
    );
    if (approved) return approved;

    const snapshot = (await getPublicCreatorSnapshots())[0];
    if (!snapshot) return null;
    const now = new Date().toISOString();
    return {
      id: `catalogue-${snapshot.creatorKey}`,
      user_id: null,
      creator_key: snapshot.creatorKey,
      display_name: snapshot.displayName,
      google_email: "",
      approval_status: "approved",
      platform: snapshot.platform,
      market: snapshot.market,
      categories: snapshot.categories,
      onboarding_source: "self_registered",
      claim_state: "claimed",
      created_by_admin_id: null,
      profile_image_url: null,
      specialty: null,
      bio: null,
      instagram_handle: null,
      instagram_url: null,
      instagram_followers: 0,
      tiktok_handle: null,
      tiktok_url: null,
      tiktok_followers: 0,
      followers_verified_at: null,
      created_at: now,
      updated_at: now,
    };
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return null;
  }
}

export type CreatorMissionParticipation = CampaignParticipation & {
  campaign_title: string;
  campaign_brief: string;
  campaign_category: string;
  content_deadline: string | null;
  campaign_markets: string[];
};

export async function getCreatorMissionParticipations(creatorId: string): Promise<CreatorMissionParticipation[]> {
  if (!hasDatabase()) return [];
  return query<CreatorMissionParticipation>(
    `SELECT p.*, c.title AS campaign_title, c.brief AS campaign_brief,
            c.category AS campaign_category, c.content_deadline, c.markets AS campaign_markets
       FROM campaign_participations p
       JOIN campaigns c ON c.id = p.campaign_id
      WHERE p.creator_account_id = $1
      ORDER BY p.updated_at DESC`,
    [creatorId],
  );
}

export async function getParticipationForCreator(creatorId: string, participationId: string): Promise<CreatorMissionParticipation | null> {
  if (!hasDatabase()) return null;
  return one<CreatorMissionParticipation>(
    `SELECT p.*, c.title AS campaign_title, c.brief AS campaign_brief,
            c.category AS campaign_category, c.content_deadline, c.markets AS campaign_markets
       FROM campaign_participations p
       JOIN campaigns c ON c.id = p.campaign_id
      WHERE p.id = $2 AND p.creator_account_id = $1`,
    [creatorId, participationId],
  );
}

const CREATOR_PERFORMANCE_CURRENCIES = ["KRW", "USD", "VND", "TWD", "MYR"] as const;
export type CreatorPerformanceCurrency = typeof CREATOR_PERFORMANCE_CURRENCIES[number];
export type CreatorPerformanceInput = {
  views: number;
  likes: number;
  comments: number;
  orders: number;
  revenue: number;
  currency: CreatorPerformanceCurrency;
};

function assertCreatorPerformanceInput(input: CreatorPerformanceInput) {
  for (const value of [input.views, input.likes, input.comments, input.orders]) {
    if (!Number.isInteger(value) || value < 0) throw new Error("Performance counts must be non-negative integers.");
  }
  if (typeof input.revenue !== "number" || !Number.isFinite(input.revenue) || input.revenue < 0) {
    throw new Error("Revenue must be a non-negative number.");
  }
  if (!CREATOR_PERFORMANCE_CURRENCIES.includes(input.currency)) {
    throw new Error("Currency is not supported.");
  }
}

export async function upsertCampaignPerformance(creatorId: string, participationId: string, input: CreatorPerformanceInput): Promise<CampaignPerformance> {
  assertCreatorPerformanceInput(input);
  return withDatabaseTransaction(async (client) => {
    const participationResult = await client.query<CampaignParticipation>(
      "SELECT * FROM campaign_participations WHERE id = $1 AND creator_account_id = $2 FOR UPDATE",
      [participationId, creatorId],
    );
    const participation = participationResult.rows[0];
    if (!participation) throw new Error("Campaign participation was not found.");
    if (participation.status !== "published" && participation.status !== "settlement" && participation.status !== "completed") {
      throw new Error("Performance is not available for this mission.");
    }
    const saved = await client.query<CampaignPerformance>(
      `INSERT INTO campaign_performance (participation_id, views, likes, comments, orders, revenue, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (participation_id) DO UPDATE
         SET views = EXCLUDED.views, likes = EXCLUDED.likes, comments = EXCLUDED.comments,
             orders = EXCLUDED.orders, revenue = EXCLUDED.revenue, currency = EXCLUDED.currency, updated_at = now()
       RETURNING *`,
      [participationId, input.views, input.likes, input.comments, input.orders, input.revenue, input.currency],
    );
    const performance = saved.rows[0];
    if (!performance) throw new Error("Campaign performance could not be saved.");
    return performance;
  });
}

export type CreatorSettlementSummary = CreatorRewardSummary[];

export async function getCreatorSettlementSummary(creatorId: string): Promise<CreatorSettlementSummary> {
  if (!hasDatabase()) return [];
  const rows = await query<Pick<CampaignParticipation, "status" | "expected_reward" | "settlement_status">>(
    `SELECT p.status, p.expected_reward, p.settlement_status
       FROM campaign_participations p
      WHERE p.creator_account_id = $1
      ORDER BY p.updated_at DESC`,
    [creatorId],
  );
  return summarizeCreatorSettlementRewards(rows);
}

export async function getCreatorSettlementItems(creatorId: string): Promise<CreatorSettlementItem[]> {
  if (!hasDatabase()) return [];
  const rows = await query<CreatorSettlementLedgerRow>(
    `SELECT p.id, c.title AS campaign_title, c.category AS campaign_category,
            p.status, p.expected_reward, p.settlement_status, p.updated_at
       FROM campaign_participations p
       JOIN campaigns c ON c.id = p.campaign_id
      WHERE p.creator_account_id = $1
      ORDER BY p.updated_at DESC`,
    [creatorId],
  );
  return toCreatorSettlementItems(rows);
}

export async function getContentSubmissionsForParticipation(participationId: string): Promise<ContentSubmission[]> {
  if (!hasDatabase()) return [];
  return query<ContentSubmission>(
    "SELECT * FROM content_submissions WHERE participation_id = $1 ORDER BY version DESC",
    [participationId],
  );
}

export async function getCampaignEventsForParticipation(participationId: string): Promise<CampaignEvent[]> {
  if (!hasDatabase()) return [];
  return query<CampaignEvent>(
    "SELECT * FROM campaign_events WHERE participation_id = $1 ORDER BY created_at DESC",
    [participationId],
  );
}

export async function createContentSubmission(creatorId: string, participationId: string, input: {
  contentUrl: string;
  captionText: string;
}): Promise<ContentSubmission> {
  return withDatabaseTransaction(async (client) => {
    const participationResult = await client.query<CampaignParticipation>(
      "SELECT * FROM campaign_participations WHERE id = $1 AND creator_account_id = $2 FOR UPDATE",
      [participationId, creatorId],
    );
    const participation = participationResult.rows[0];
    if (!participation) throw new Error("Campaign participation was not found.");
    if (participation.status !== "creating" && participation.status !== "review") {
      throw new Error("Submission is not available for this mission.");
    }

    const creatorResult = await client.query<Pick<CreatorAccount, "user_id">>(
      "SELECT user_id FROM creator_accounts WHERE id = $1",
      [creatorId],
    );
    const versionResult = await client.query<{ version: number }>(
      "SELECT COALESCE(MAX(version), 0) + 1 AS version FROM content_submissions WHERE participation_id = $1",
      [participationId],
    );
    const version = Number(versionResult.rows[0]?.version || 1);
    const submissionResult = await client.query<ContentSubmission>(
      `INSERT INTO content_submissions (participation_id, version, content_url, caption_text, status)
       VALUES ($1, $2, $3, $4, 'submitted')
       RETURNING *`,
      [participationId, version, input.contentUrl, input.captionText],
    );
    const submission = submissionResult.rows[0];
    if (!submission) throw new Error("Content submission could not be saved.");

    const participationUpdate = await client.query<CampaignParticipation>(
      `UPDATE campaign_participations
          SET status = 'review', next_action = 'Await review', updated_at = now()
        WHERE id = $1 AND creator_account_id = $2
        RETURNING *`,
      [participationId, creatorId],
    );
    const updated = participationUpdate.rows[0];
    if (!updated) throw new Error("Campaign participation could not be updated.");
    await client.query(
      `INSERT INTO campaign_events (participation_id, actor_user_id, event_type, from_status, to_status, message)
       VALUES ($1, $2, 'content_submitted', $3, $4, $5)`,
      [participationId, creatorResult.rows[0]?.user_id ?? null, participation.status, updated.status, `Content version ${version} submitted.`],
    );
    return submission;
  });
}

export async function getCreatorAccountByEmail(email: string): Promise<CreatorAccount | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  try {
    return await one<CreatorAccount>(
      "SELECT * FROM creator_accounts WHERE lower(google_email) = $1",
      [email.trim().toLowerCase()],
    );
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return null;
  }
}

export type AdminCreatorAccount = CreatorAccount & {
  is_linked: boolean;
};

type PublicCreatorSnapshot = {
  creatorKey: string;
  displayName: string;
  platform: string;
  market: string;
  categories: string[];
  profileImageUrl: string | null;
  followerTotal: number;
};

function creatorAttribute(source: string, name: string) {
  return source.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1]?.trim() || "";
}

function creatorText(source: string, selector: string) {
  return source.match(new RegExp(`<${selector}\\b[^>]*>([\\s\\S]*?)<\\/${selector}>`, "i"))?.[1]
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "";
}

function creatorKeyFromSnapshot(displayName: string, detail: string) {
  const handle = detail.match(/@[\w.]+/)?.[0];
  return (handle || displayName).toLowerCase().replace(/\s+/g, "-").slice(0, 120);
}

export async function createCreatorApplication(input: import("./creator-onboarding").CreatorApplicationInput): Promise<CreatorAccount> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    throw new Error("Database is required for creator applications.");
  }
  const instagramHandle = input.instagramUrl.match(/instagram\.com\/([^/?#]+)/i)?.[1] || null;
  const tiktokHandle = input.tiktokUrl.match(/tiktok\.com\/@?([^/?#]+)/i)?.[1] || null;
  const platform = [input.instagramUrl && "Instagram", input.tiktokUrl && "TikTok"].filter(Boolean).join(" · ");
  const creatorKey = `self-${input.userId}`;
  const creator = await one<CreatorAccount>(
    `INSERT INTO creator_accounts
       (user_id, creator_key, display_name, google_email, approval_status, platform, market, categories,
        onboarding_source, claim_state, bio, instagram_handle, instagram_url, tiktok_handle, tiktok_url)
     VALUES ($1, $2, $3, $4, 'approved', $5, $6, $7::jsonb,
             'self_registered', 'claimed', $8, $9, $10, $11, $12)
     RETURNING *`,
    [input.userId, creatorKey, input.displayName, input.email, platform, input.market, JSON.stringify([input.category]),
      input.bio || null, instagramHandle, input.instagramUrl || null, tiktokHandle, input.tiktokUrl || null],
  );
  if (!creator) throw new Error("Failed to create creator application.");
  await query("UPDATE users SET role = 'creator', updated_at = now() WHERE id = $1 AND role NOT IN ('admin', 'agency')", [input.userId]);
  await query(
    `INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
     VALUES ($1, 'creator', $2, 'active', false)
     ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key
     DO UPDATE SET status = 'active', updated_at = now()`,
    [input.userId, creator.id],
  );
  return creator;
}

function inlineCreatorArray(source: string, variableName: string) {
  const escapedName = variableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = source.match(new RegExp(`const\\s+${escapedName}\\s*=\\s*\\[([\\s\\S]*?)\\n\\s*\\];`))?.[1] || "";
  return body.match(/\{[^{}]*\}/g) || [];
}

function inlineCreatorString(source: string, key: string) {
  return source.match(new RegExp(`\\b${key}:\\s*'([^']*)'`))?.[1]?.trim() || "";
}

function inlineCreatorNumber(source: string, key: string) {
  const value = Number(source.match(new RegExp(`\\b${key}:\\s*([0-9.]+)`))?.[1]);
  return Number.isFinite(value) ? value : 0;
}

function getRuntimeCreatorSnapshots(html: string): PublicCreatorSnapshot[] {
  const vietnam = inlineCreatorArray(html, "vietnamBeautyCreators").map((entry) => {
    const displayName = inlineCreatorString(entry, "name");
    const handle = inlineCreatorString(entry, "handle");
    const direction = inlineCreatorString(entry, "direction");
    return {
      creatorKey: creatorKeyFromSnapshot(displayName, `@${handle}`),
      displayName,
      platform: "TikTok",
      market: "Vietnam",
      categories: ["K-Beauty Creator", direction].filter(Boolean),
      profileImageUrl: inlineCreatorString(entry, "image") || null,
      followerTotal: inlineCreatorNumber(entry, "followers"),
    };
  });

  const seeding = inlineCreatorArray(html, "seedingCreators").map((entry) => {
    const displayName = inlineCreatorString(entry, "name");
    const category = inlineCreatorString(entry, "category");
    return {
      creatorKey: creatorKeyFromSnapshot(displayName, ""),
      displayName,
      platform: inlineCreatorString(entry, "platform"),
      market: "Malaysia",
      categories: [category].filter(Boolean),
      profileImageUrl: inlineCreatorString(entry, "image") || null,
      followerTotal: inlineCreatorNumber(entry, "totalValue"),
    };
  });

  return [...vietnam, ...seeding].filter((creator) => creator.creatorKey && creator.displayName);
}

async function getPublicCreatorSnapshots(): Promise<PublicCreatorSnapshot[]> {
  const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), "creators.html");
  const html = await readFile(filePath, "utf8");
  const gridStart = html.indexOf('<div class="creator-grid" id="creatorGrid">');
  const scriptStart = html.indexOf("<script>", gridStart);
  const grid = html.slice(gridStart, scriptStart > gridStart ? scriptStart : undefined);
  const cards = [...grid.matchAll(/<article\b([^>]*\bclass=["'][^"']*\bmarket-card\b[^"']*["'][^>]*)>([\s\S]*?)<\/article>/gi)];

  const staticCreators = cards.map(([, attributes, body]) => {
    const displayName = creatorText(body, "h3");
    const detail = creatorText(body, "p");
    const detailParts = detail.split("/").map((item) => item.trim()).filter(Boolean);
    const imageTag = body.match(/<img\b[^>]*>/i)?.[0] || "";
    const categories = [...new Set([
      ...creatorAttribute(attributes, "data-category").split(/\s+/).filter(Boolean),
      detailParts[1],
    ].filter(Boolean))];
    return {
      creatorKey: creatorKeyFromSnapshot(displayName, detail),
      displayName,
      platform: creatorAttribute(attributes, "data-platform"),
      market: detailParts[0] || creatorAttribute(attributes, "data-market"),
      categories,
      profileImageUrl: creatorAttribute(imageTag, "data-profile-src") || creatorAttribute(imageTag, "src") || null,
      followerTotal: Number(creatorAttribute(attributes, "data-followers")) || 0,
    };
  }).filter((creator) => creator.creatorKey && creator.displayName);

  return [...staticCreators, ...getRuntimeCreatorSnapshots(html)];
}

function toCatalogueCreatorAccount(creator: PublicCreatorSnapshot, now: string): AdminCreatorAccount {
  const instagramFollowers = creator.platform === "Instagram" ? creator.followerTotal : 0;
  const tiktokFollowers = creator.platform === "Instagram" ? 0 : creator.followerTotal;
  return {
    id: `catalogue-${creator.creatorKey}`,
    user_id: null,
    creator_key: creator.creatorKey,
    display_name: creator.displayName,
    google_email: "",
    approval_status: "pending",
    platform: creator.platform,
    market: creator.market,
    categories: creator.categories,
    onboarding_source: "self_registered",
    claim_state: "claimed",
    created_by_admin_id: null,
    profile_image_url: creator.profileImageUrl,
    specialty: null,
    bio: null,
    instagram_handle: null,
    instagram_url: null,
    instagram_followers: instagramFollowers,
    tiktok_handle: null,
    tiktok_url: null,
    tiktok_followers: tiktokFollowers,
    followers_verified_at: null,
    created_at: now,
    updated_at: now,
    is_linked: false,
  };
}

export async function getPublicCreatorForAdmin(creatorKey: string): Promise<PublicCreatorSnapshot | null> {
  const normalizedKey = creatorKey.trim().toLowerCase();
  if (!normalizedKey) return null;
  const creators = await getPublicCreatorSnapshots();
  return creators.find((creator) => creator.creatorKey === normalizedKey) ?? null;
}

export async function getCreatorAccountsForAdmin(): Promise<AdminCreatorAccount[]> {
  const creators = await getPublicCreatorSnapshots();
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    const now = new Date("2026-05-30T00:00:00Z").toISOString();
    return creators.map((creator) => toCatalogueCreatorAccount(creator, now));
  }

  const accounts = await query<CreatorAccount>("SELECT * FROM creator_accounts");
  const byKey = new Map(accounts.map((account) => [account.creator_key, account]));
  const now = new Date("2026-05-30T00:00:00Z").toISOString();
  return creators.map((creator) => {
    const account = byKey.get(creator.creatorKey);
    return account ? { ...account, is_linked: true } : toCatalogueCreatorAccount(creator, now);
  });
}

export class CreatorAccountEmailConflictError extends Error {
  constructor() {
    super("Creator email is already linked.");
    this.name = "CreatorAccountEmailConflictError";
  }
}

export function isCreatorAccountEmailConflict(error: unknown) {
  return error instanceof CreatorAccountEmailConflictError;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function upsertCreatorAccountLink(input: {
  creatorKey: string;
  displayName: string;
  googleEmail: string;
  platform: string;
  market: string;
  categories: string[];
  approvalStatus: "approved" | "disabled";
}): Promise<CreatorAccount> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for creator account linking.");

  const creatorKey = input.creatorKey.trim().toLowerCase();
  const googleEmail = input.googleEmail.trim().toLowerCase();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [googleEmail]);

    const conflict = await client.query<{ id: string }>(
      "SELECT id FROM creator_accounts WHERE lower(google_email) = $1 AND creator_key <> $2 LIMIT 1",
      [googleEmail, creatorKey],
    );
    if (conflict.rows[0]) throw new CreatorAccountEmailConflictError();

    const saved = await client.query<CreatorAccount>(
      `INSERT INTO creator_accounts
         (creator_key, display_name, google_email, platform, market, categories, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       ON CONFLICT (creator_key) DO UPDATE
         SET display_name = creator_accounts.display_name,
             google_email = EXCLUDED.google_email,
             user_id = CASE
               WHEN lower(creator_accounts.google_email) = EXCLUDED.google_email THEN creator_accounts.user_id
               ELSE NULL
             END,
             platform = creator_accounts.platform,
             market = creator_accounts.market,
             categories = creator_accounts.categories,
             approval_status = EXCLUDED.approval_status,
             updated_at = now()
       RETURNING *`,
      [creatorKey, input.displayName, googleEmail, input.platform, input.market, JSON.stringify(input.categories), input.approvalStatus],
    );
    const account = saved.rows[0];
    if (!account) throw new Error("Creator account could not be saved.");

    await client.query("COMMIT");
    return account;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (isUniqueViolation(error)) throw new CreatorAccountEmailConflictError();
    throw error;
  } finally {
    client.release();
  }
}

export type LinkedCreatorAccount = {
  creator: CreatorAccount;
  user: User;
};

export async function linkCreatorAccountToUser(creatorId: string, userId: string, email: string): Promise<LinkedCreatorAccount | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  const normalizedEmail = email.trim().toLowerCase();
  return withDatabaseTransaction(async (client) => {
    const userResult = await client.query<User>(
      "SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    const user = userResult.rows[0];
    if (!user) return null;

    const creatorResult = await client.query<CreatorAccount>(
      `SELECT *
         FROM creator_accounts
        WHERE id = $1
          AND approval_status = 'approved'
          AND (user_id IS NULL OR user_id = $2)
          AND lower(google_email) = $3
        FOR UPDATE`,
      [creatorId, userId, normalizedEmail],
    );
    const before = creatorResult.rows[0];
    if (!before) return null;

    const linkedResult = await client.query<CreatorAccount>(
      `UPDATE creator_accounts
          SET user_id = $1, claim_state = 'claimed', updated_at = now()
        WHERE id = $2
          AND approval_status = 'approved'
          AND lower(google_email) = $3
          AND (user_id IS NULL OR user_id = $1)
        RETURNING *`,
      [userId, creatorId, normalizedEmail],
    );
    const linked = linkedResult.rows[0];
    if (!linked) return null;

    let sessionUser = user;
    if (user.role !== "admin" && user.role !== "creator") {
      const promoted = await client.query<User>(
        `UPDATE users
            SET role = $2, updated_at = now()
          WHERE id = $1 AND role NOT IN ('admin', 'creator')
          RETURNING id, email, role, created_at, updated_at`,
        [userId, "creator"],
      );
      sessionUser = promoted.rows[0] ?? user;
    }
    if (before.user_id !== userId || before.claim_state !== "claimed") {
      await client.query(
        `INSERT INTO creator_management_audit_logs
          (actor_user_id, action, group_id, creator_account_id, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [userId, "creator_claimed", null, creatorId, JSON.stringify({ email: normalizedEmail })],
      );
    }
    return { creator: linked, user: sessionUser };
  });
}

export async function updateUserRole(userId: string, role: Role): Promise<User | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  return one<User>(
    "UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING id, email, role, created_at, updated_at",
    [userId, role],
  );
}

async function linkDesignerByEmail(userId: string, email: string): Promise<Designer | null> {
  return one<Designer>(
    `UPDATE designers
        SET user_id = $1, updated_at = now()
      WHERE id = (
        SELECT id FROM designers
         WHERE lower(contact_email) = lower($2) AND user_id IS NULL
         ORDER BY created_at DESC
         LIMIT 1
      )
      RETURNING *`,
    [userId, email],
  );
}

async function getLinkableUserIdByEmail(email: string): Promise<string | null> {
  const row = await one<{ id: string }>(
    `SELECT users.id
       FROM users
       LEFT JOIN designers ON designers.user_id = users.id
      WHERE lower(users.email) = lower($1)
        AND designers.id IS NULL
      LIMIT 1`,
    [email],
  );
  return row?.id ?? null;
}

export async function getDesignerLinkUserId(input: { sessionUserId: string; sessionUserEmail: string; contactEmail: string }) {
  if (!hasDatabase()) return undefined;

  const matchingUserId = await getLinkableUserIdByEmail(input.contactEmail);
  if (matchingUserId) return matchingUserId;

  if (input.sessionUserEmail.toLowerCase() !== input.contactEmail.toLowerCase()) return undefined;

  const sessionDesigner = await getDesignerForUser(input.sessionUserId).catch(() => null);
  return sessionDesigner ? undefined : input.sessionUserId;
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
    const linked = await one<Designer>("SELECT * FROM designers WHERE user_id = $1", [userId]);
    if (linked) return linked;

    const user = await one<Pick<User, "email">>("SELECT email FROM users WHERE id = $1", [userId]);
    return user ? await linkDesignerByEmail(userId, user.email) : null;
  } catch (error) {
    if (!canUseDemoData()) throw error;
    return null;
  }
}

export type PublicBeautyProduct = Product & {
  brand_name: string;
  brand_country: string;
};

/** Public catalogue: only products explicitly published by an approved beauty workspace. */
export async function getPublicBeautyProducts(limit = 100): Promise<PublicBeautyProduct[]> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return [];
  }

  return query<PublicBeautyProduct>(
    `SELECT products.*, designers.brand_name, designers.country AS brand_country
       FROM products
       JOIN designers ON designers.id = products.designer_id
      WHERE products.status = 'active'
        AND products.approval_status = 'approved'
        AND designers.approval_status = 'approved'
        AND EXISTS (
          SELECT 1
            FROM user_workspace_memberships memberships
           WHERE memberships.resource_id = designers.id
             AND memberships.workspace_type = 'beauty_partner'
             AND memberships.status = 'active'
        )
      ORDER BY products.created_at DESC
      LIMIT $1`,
    [Math.max(1, Math.min(limit, 100))],
  );
}

export type MasterPartnerWorkspace = UserWorkspaceMembership & {
  brand_category: string;
  designer_user_id: string;
};

export async function ensureMasterPartnerWorkspace(input: {
  userId: string;
  email: string;
  workspaceType: PartnerWorkspaceType;
  allowMasterProvision: boolean;
}): Promise<MasterPartnerWorkspace> {
  if (!input.allowMasterProvision) throw new Error("Master workspace provisioning is not allowed.");
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for master workspace provisioning.");

  const category = input.workspaceType === "fashion_partner" ? "K-패션" : "K-뷰티";
  const oppositeType = input.workspaceType === "fashion_partner" ? "beauty_partner" : "fashion_partner";
  const brandName = input.workspaceType === "fashion_partner" ? "K-MODU MASTER FASHION" : "K-MODU MASTER BEAUTY";

  return withDatabaseTransaction(async (client) => {
    await client.query(
      `UPDATE user_workspace_memberships requested
          SET status = 'disabled', is_default = false, updated_at = now()
        WHERE requested.user_id = $1
          AND requested.workspace_type = $2
          AND EXISTS (
            SELECT 1 FROM user_workspace_memberships opposite
             WHERE opposite.user_id = requested.user_id
               AND opposite.workspace_type = $3
               AND opposite.resource_id = requested.resource_id
               AND opposite.status = 'active'
          )`,
      [input.userId, input.workspaceType, oppositeType],
    );

    const existingResult = await client.query<MasterPartnerWorkspace>(
      `SELECT memberships.*, designers.brand_category, designers.user_id AS designer_user_id
         FROM user_workspace_memberships memberships
         JOIN designers
           ON designers.id = memberships.resource_id
          AND designers.user_id = memberships.user_id
        WHERE memberships.user_id = $1
          AND memberships.workspace_type = $2
          AND memberships.status = 'active'
          AND designers.brand_category = $3
        ORDER BY memberships.created_at ASC
        LIMIT 1`,
      [input.userId, input.workspaceType, category],
    );
    if (existingResult.rows[0]) return existingResult.rows[0];

    const candidateResult = await client.query<Designer>(
      `SELECT designers.*
         FROM designers
        WHERE designers.user_id = $1
          AND designers.brand_category = $2
          AND NOT EXISTS (
            SELECT 1 FROM user_workspace_memberships opposite
             WHERE opposite.user_id = designers.user_id
               AND opposite.workspace_type = $3
               AND opposite.resource_id = designers.id
               AND opposite.status = 'active'
          )
        ORDER BY designers.created_at ASC
        LIMIT 1`,
      [input.userId, category, oppositeType],
    );
    let designer = candidateResult.rows[0];
    if (!designer) {
      const inserted = await client.query<Designer>(
        `INSERT INTO designers
          (user_id, brand_name, designer_name, contact_email, contact_phone, description, brand_category, mood, country, approval_status)
         VALUES ($1, $2, 'K-MODU 운영자', $3, '', $4, $5, $6, 'South Korea', 'approved')
         RETURNING *`,
        [input.userId, brandName, input.email.trim().toLowerCase(), `${category} 운영 검증용 전용 브랜드`, category, category],
      );
      designer = inserted.rows[0];
    }
    if (!designer || designer.user_id !== input.userId || designer.brand_category !== category) {
      throw new Error("Master partner resource ownership validation failed.");
    }

    await client.query(
      `INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
       VALUES ($1, $2, $3, 'active', false)
       ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key
       DO UPDATE SET status = 'active', updated_at = now()`,
      [input.userId, input.workspaceType, designer.id],
    );

    const verified = await client.query<MasterPartnerWorkspace>(
      `SELECT memberships.*, designers.brand_category, designers.user_id AS designer_user_id
         FROM user_workspace_memberships memberships
         JOIN designers
           ON designers.id = memberships.resource_id
          AND designers.user_id = memberships.user_id
        WHERE memberships.user_id = $1
          AND memberships.workspace_type = $2
          AND memberships.resource_id = $3
          AND memberships.status = 'active'
          AND designers.brand_category = $4
          AND designers.user_id = $1
        LIMIT 1`,
      [input.userId, input.workspaceType, designer.id, category],
    );
    if (!verified.rows[0]) throw new Error("Master partner workspace verification failed.");
    return verified.rows[0];
  });
}

export async function getDesignerForUserAndId(userId: string, designerId: string): Promise<Designer | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  return one<Designer>(
    "SELECT * FROM designers WHERE id = $2 AND user_id = $1",
    [userId, designerId],
  );
}

export async function updateDesignerApprovalStatus(id: string, status: "approved" | "disabled" | "rejected") {
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
  designer_name: string;
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
         designer_name = COALESCE($6, designer_name),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, input.brand_name ?? null, input.description ?? null, input.mood ?? null, input.country ?? null, input.designer_name ?? null],
  );
}

// ─── 룩북: 승인 자산을 묶어 공개 링크로 공유 ─────────────────────────────

export type PublicLookbook = Lookbook & {
  designer_brand_name: string;
  designer_description: string;
  designer_mood: string;
};

function newLookbookSlug() {
  return randomBytes(4).toString("hex");
}

export async function createLookbookForDesigner(input: {
  designerId: string;
  title: string;
  tagline: string;
  items: LookbookItem[];
  lang?: "ko" | "en";
  intro?: string;
  layouts?: LookbookLayout[];
}): Promise<Lookbook | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  // 슬러그 충돌(희박) 시 3회까지 재시도
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await one<Lookbook>(
        `INSERT INTO lookbooks (designer_id, slug, title, tagline, items, lang, intro, layouts)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb)
         RETURNING *`,
        [input.designerId, newLookbookSlug(), input.title, input.tagline, JSON.stringify(input.items), input.lang || "ko", input.intro || "", JSON.stringify(input.layouts || [])],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("duplicate key") || attempt === 2) throw error;
    }
  }
  return null;
}

export async function getLookbookForDesigner(designerId: string, id: string): Promise<Lookbook | null> {
  if (!hasDatabase()) return null;
  return one<Lookbook>(
    "SELECT * FROM lookbooks WHERE id = $2 AND designer_id = $1",
    [designerId, id],
  );
}

export async function getLookbooksForDesigner(designerId: string): Promise<Lookbook[]> {
  if (!hasDatabase()) return [];
  return query<Lookbook>(
    "SELECT * FROM lookbooks WHERE designer_id = $1 ORDER BY created_at DESC",
    [designerId],
  );
}

export async function updateLookbookForDesigner(
  designerId: string,
  id: string,
  input: Partial<{ title: string; tagline: string; items: LookbookItem[]; status: "published" | "hidden"; layouts: LookbookLayout[] }>,
): Promise<Lookbook | null> {
  if (!hasDatabase()) {
    requireDatabaseForProduction();
    return null;
  }
  return one<Lookbook>(
    `UPDATE lookbooks
     SET title = COALESCE($3, title),
         tagline = COALESCE($4, tagline),
         items = COALESCE($5::jsonb, items),
         status = COALESCE($6, status),
         layouts = COALESCE($7::jsonb, layouts),
         updated_at = now()
     WHERE id = $2 AND designer_id = $1
     RETURNING *`,
    [
      designerId,
      id,
      input.title ?? null,
      input.tagline ?? null,
      input.items ? JSON.stringify(input.items) : null,
      input.status ?? null,
      input.layouts ? JSON.stringify(input.layouts) : null,
    ],
  );
}

export async function deleteLookbookForDesigner(designerId: string, id: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  const rows = await query<{ id: string }>(
    "DELETE FROM lookbooks WHERE id = $2 AND designer_id = $1 RETURNING id",
    [designerId, id],
  );
  return rows.length > 0;
}

export async function getPublishedLookbookBySlug(slug: string): Promise<PublicLookbook | null> {
  if (!hasDatabase()) return null;
  const [lookbook] = await query<PublicLookbook>(
    `SELECT lookbooks.*,
            designers.brand_name AS designer_brand_name,
            designers.description AS designer_description,
            designers.mood AS designer_mood
       FROM lookbooks
       JOIN designers ON designers.id = lookbooks.designer_id
      WHERE lookbooks.slug = $1
        AND lookbooks.status = 'published'
        AND designers.approval_status = 'approved'`,
    [slug],
  );
  return lookbook || null;
}
