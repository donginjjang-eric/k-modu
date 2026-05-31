import { Pool } from "pg";
import type { QueryResultRow } from "pg";
import { designer as phaseDesigner, modelTemplates as phaseTemplates, products as phaseProducts } from "./phase1-data";
import type { Designer, GeneratedLook, ModelTemplate, Product, User } from "./types";

let pool: Pool | null = null;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
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
  try {
    return await query<Designer>("SELECT * FROM designers WHERE approval_status = 'approved' ORDER BY created_at DESC");
  } catch {
    return [toDemoDesigner()];
  }
}

export async function getAllDesigners(): Promise<Designer[]> {
  if (!hasDatabase()) return [toDemoDesigner()];
  try {
    return await query<Designer>("SELECT * FROM designers ORDER BY created_at DESC");
  } catch {
    return [toDemoDesigner()];
  }
}

export async function getDesigner(id: string): Promise<Designer | null> {
  if (!hasDatabase()) return id === phaseDesigner.id ? toDemoDesigner() : null;
  try {
    return await one<Designer>("SELECT * FROM designers WHERE id = $1", [id]);
  } catch {
    return id === phaseDesigner.id ? toDemoDesigner() : null;
  }
}

export async function getProductsForDesigner(designerId: string): Promise<Product[]> {
  if (!hasDatabase()) return designerId === phaseDesigner.id ? toDemoProducts() : [];
  try {
    return await query<Product>(
      "SELECT * FROM products WHERE designer_id = $1 AND status <> 'hidden' ORDER BY created_at DESC",
      [designerId],
    );
  } catch {
    return designerId === phaseDesigner.id ? toDemoProducts() : [];
  }
}

export async function getModelTemplates(): Promise<ModelTemplate[]> {
  if (!hasDatabase()) return toDemoModelTemplates();
  try {
    return await query<ModelTemplate>("SELECT * FROM model_templates ORDER BY created_at ASC");
  } catch {
    return toDemoModelTemplates();
  }
}

export async function getGeneratedLooksForDesigner(designerId: string): Promise<GeneratedLook[]> {
  if (!hasDatabase()) return [];
  return query<GeneratedLook>(
    "SELECT * FROM generated_looks WHERE designer_id = $1 ORDER BY created_at DESC",
    [designerId],
  );
}

export async function getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
  const demoUser = () => {
    const now = new Date("2026-05-30T00:00:00Z").toISOString();
    const demoUsers: Array<User & { password_hash: string }> = [
      {
        id: "demo-admin-user",
        email: "admin@k-modu.test",
        role: "admin",
        password_hash: "demo-admin-password",
        created_at: now,
        updated_at: now,
      },
      {
        id: "demo-designer-user",
        email: "designer@k-modu.test",
        role: "designer",
        password_hash: "kmodu-demo-password",
        created_at: now,
        updated_at: now,
      },
    ];
    return demoUsers.find((user) => user.email === email.toLowerCase()) ?? null;
  }
  if (!hasDatabase()) return demoUser();
  try {
    return await one<User & { password_hash: string }>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  } catch {
    return demoUser();
  }
}

export async function getDesignerForUser(userId: string): Promise<Designer | null> {
  if (!hasDatabase()) return userId === "demo-designer-user" ? toDemoDesigner() : null;
  try {
    return await one<Designer>("SELECT * FROM designers WHERE user_id = $1", [userId]);
  } catch {
    return userId === "demo-designer-user" ? toDemoDesigner() : null;
  }
}

export async function updateDesignerApprovalStatus(id: string, status: "approved" | "disabled") {
  if (!hasDatabase()) return toDemoDesigner();
  return one<Designer>(
    "UPDATE designers SET approval_status = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, status],
  );
}
