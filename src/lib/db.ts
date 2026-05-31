import { Pool } from "pg";
import type { QueryResultRow } from "pg";
import { designer as phaseDesigner, modelTemplates as phaseTemplates, products as phaseProducts } from "./phase1-data";
import type { Designer, GeneratedLook, ModelTemplate, Product } from "./types";

let pool: Pool | null = null;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("railway") ? { rejectUnauthorized: false } : undefined,
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
  if (!hasDatabase()) return [toDemoDesigner()];
  return query<Designer>("SELECT * FROM designers WHERE approval_status = 'approved' ORDER BY created_at DESC");
}

export async function getDesigner(id: string): Promise<Designer | null> {
  if (!hasDatabase()) return id === phaseDesigner.id ? toDemoDesigner() : null;
  return one<Designer>("SELECT * FROM designers WHERE id = $1", [id]);
}

export async function getProductsForDesigner(designerId: string): Promise<Product[]> {
  if (!hasDatabase()) return designerId === phaseDesigner.id ? toDemoProducts() : [];
  return query<Product>(
    "SELECT * FROM products WHERE designer_id = $1 AND status <> 'hidden' ORDER BY created_at DESC",
    [designerId],
  );
}

export async function getModelTemplates(): Promise<ModelTemplate[]> {
  if (!hasDatabase()) return toDemoModelTemplates();
  return query<ModelTemplate>("SELECT * FROM model_templates ORDER BY created_at ASC");
}

export async function getGeneratedLooksForDesigner(designerId: string): Promise<GeneratedLook[]> {
  if (!hasDatabase()) return [];
  return query<GeneratedLook>(
    "SELECT * FROM generated_looks WHERE designer_id = $1 ORDER BY created_at DESC",
    [designerId],
  );
}
