import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const projectRoot = process.cwd();
const assetsRoot = path.join(projectRoot, "assets");
const dataRoot = process.env.DATA_DIR || (process.env.RAILWAY_ENVIRONMENT ? "/data" : path.join(projectRoot, ".runtime"));
const roots = {
  productUploads: path.join(dataRoot, "uploads", "products"),
  generatedLooks: path.join(dataRoot, "generated-looks"),
  modelTemplates: path.join(dataRoot, "model-templates"),
};
const contentTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function decodePayload() {
  const raw = process.argv[2];
  if (!raw) throw new Error("Worker payload is required.");
  return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
}

function readPublicImageAsDataUrl(imagePath) {
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith("data:")) return imagePath;

  const normalized = imagePath.replace(/^\/+/, "");
  let filePath = "";
  if (normalized.startsWith("assets/")) filePath = path.join(assetsRoot, normalized.slice("assets/".length));
  if (normalized.startsWith("uploads/products/")) filePath = path.join(roots.productUploads, path.basename(normalized));
  if (normalized.startsWith("model-templates/")) filePath = path.join(roots.modelTemplates, path.basename(normalized));

  const allowedRoots = [assetsRoot, roots.productUploads, roots.modelTemplates];
  if (!allowedRoots.some((root) => filePath.startsWith(root)) || !existsSync(filePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = contentTypes[ext] || "image/png";
  return `data:${mimeType};base64,${readFileSync(filePath).toString("base64")}`;
}

function saveGeneratedPng(fileName, base64Image) {
  mkdirSync(roots.generatedLooks, { recursive: true });
  const safeFileName = path.basename(fileName).replace(/[^a-z0-9._-]/gi, "-");
  const filePath = path.join(roots.generatedLooks, safeFileName);
  const bytes = Buffer.from(base64Image, "base64");
  writeFileSync(filePath, bytes);
  return `/generated-looks/${safeFileName}`;
}

function buildPrompt({ designer, template, products, stylingPrompt }) {
  const itemLines = products.map((product, index) => (
    `${index + 1}. ${product.name} (${product.category}) - ${product.mood || product.description || "designer product"}`
  )).join("\n");

  return [
    "Create one photorealistic K-MODU AI Lookbook Generation image.",
    "This is a brand lookbook image generation task, not exact size fitting.",
    `Brand: ${designer.brand_name}`,
    `Brand mood: ${designer.mood}`,
    `Model template: ${template.name}. ${template.prompt_description}`,
    "Selected products:",
    itemLines,
    `Styling prompt: ${stylingPrompt || "minimal editorial K-fashion full look preview"}`,
    "Use the first input image as the fixed model reference and the remaining input images as product/style references.",
    "Show one adult fashion model wearing a cohesive Full Look Preview inspired by the selected products.",
    "Vertical 4:5 composition, full body or 7/8 body centered, realistic fabric, realistic face and hands.",
    "No text, no logo, no watermark, no collage, no extra people, no product flat-lay.",
  ].join("\n");
}

async function main() {
  const input = decodePayload();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("railway") && !process.env.DATABASE_URL.includes(".railway.internal")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    const prompt = buildPrompt(input);
    const imageInputs = [
      input.template.image_url,
      ...input.products.map((product) => product.tryon_image_url || product.image_url),
    ].slice(0, 16);

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
        size: process.env.OPENAI_IMAGE_SIZE || "1024x1536",
        prompt,
        images: imageInputs.map((image) => ({ image_url: readPublicImageAsDataUrl(image) })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI image generation failed with ${response.status}: ${errorText.slice(0, 220)}`);
    }

    const result = await response.json();
    const base64Image = result.data?.[0]?.b64_json;
    const urlImage = result.data?.[0]?.url;
    const imageUrl = base64Image ? saveGeneratedPng(`look-${input.cacheKey}.png`, base64Image) : urlImage;
    if (!imageUrl) throw new Error("OpenAI image generation completed without an image output.");

    await pool.query(
      `INSERT INTO generated_looks (
         designer_id, model_template_id, selected_product_ids, cache_key, prompt, image_url, provider, cache_hit, status
       )
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, 'openai', false, 'generated')
       ON CONFLICT (cache_key) WHERE status <> 'hidden' DO UPDATE
         SET updated_at = now()
       RETURNING id`,
      [
        input.designer.id,
        input.template.id,
        JSON.stringify(input.products.map((product) => product.id)),
        input.cacheKey,
        prompt,
        imageUrl,
      ],
    );
    await pool.query(
      `INSERT INTO generation_logs (user_id, designer_id, provider, cache_key, cache_hit, status, error_message)
       VALUES ($1, $2, 'openai', $3, false, 'generated', null)`,
      [input.userId, input.designer.id, input.cacheKey],
    );
    console.log(JSON.stringify({ ok: true, cacheKey: input.cacheKey, imageUrl }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    console.error(JSON.stringify({ ok: false, cacheKey: input.cacheKey, error: message }));
    await pool.query(
      `INSERT INTO generation_logs (user_id, designer_id, provider, cache_key, cache_hit, status, error_message)
       VALUES ($1, $2, 'openai', $3, false, 'failed', $4)`,
      [input.userId, input.designer.id, input.cacheKey, message],
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
