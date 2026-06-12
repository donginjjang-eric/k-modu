import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

// Railway 버킷 어댑터 (src/lib/storage.ts와 동일 규칙의 경량 미러)
const bucketKeyPrefixes = {
  productUploads: "uploads/products",
  generatedLooks: "generated-looks",
  modelTemplates: "model-templates",
};

const hasBucket = () => Boolean(
  process.env.S3_BUCKET && process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
);

let s3Client = null;
function getS3() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return s3Client;
}

async function getBucketObjectBytes(kind, fileName) {
  if (!hasBucket()) return null;
  try {
    const result = await getS3().send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `${bucketKeyPrefixes[kind]}/${path.basename(fileName)}`,
    }));
    const bytes = await result.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch {
    return null;
  }
}

function decodePayload() {
  const raw = process.argv[2];
  if (!raw) throw new Error("Worker payload is required.");
  return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
}

async function readPublicImageAsDataUrl(imagePath) {
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith("data:")) return imagePath;

  const normalized = imagePath.replace(/^\/+/, "");
  let filePath = "";
  let kind = null;
  if (normalized.startsWith("assets/")) filePath = path.join(assetsRoot, normalized.slice("assets/".length));
  if (normalized.startsWith("uploads/products/")) kind = "productUploads";
  if (normalized.startsWith("model-templates/")) kind = "modelTemplates";
  if (kind) filePath = path.join(roots[kind], path.basename(normalized));

  const ext = path.extname(normalized).toLowerCase();
  const mimeType = contentTypes[ext] || "image/png";

  const allowedRoots = [assetsRoot, roots.productUploads, roots.modelTemplates];
  if (filePath && allowedRoots.some((root) => filePath.startsWith(root)) && existsSync(filePath)) {
    return `data:${mimeType};base64,${readFileSync(filePath).toString("base64")}`;
  }

  // 볼륨에 없으면 버킷에서 (신규 업로드는 버킷에만 존재)
  if (kind) {
    const bytes = await getBucketObjectBytes(kind, path.basename(normalized));
    if (bytes) return `data:${mimeType};base64,${bytes.toString("base64")}`;
  }

  throw new Error(`Image not found: ${imagePath}`);
}

async function saveGeneratedPng(fileName, base64Image) {
  const safeFileName = path.basename(fileName).replace(/[^a-z0-9._-]/gi, "-");
  const bytes = Buffer.from(base64Image, "base64");

  if (hasBucket()) {
    await getS3().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `${bucketKeyPrefixes.generatedLooks}/${safeFileName}`,
      Body: bytes,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    }));
  } else {
    mkdirSync(roots.generatedLooks, { recursive: true });
    writeFileSync(path.join(roots.generatedLooks, safeFileName), bytes);
  }
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
    "Use the first input image as the fixed brand representative model reference and the remaining input images as product/style references.",
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
    const images = await Promise.all(
      imageInputs.map(async (image) => ({ image_url: await readPublicImageAsDataUrl(image) })),
    );

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
        images,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI image generation failed with ${response.status}: ${errorText.slice(0, 220)}`);
    }

    const result = await response.json();
    const base64Image = result.data?.[0]?.b64_json;
    const urlImage = result.data?.[0]?.url;
    const imageUrl = base64Image ? await saveGeneratedPng(`look-${input.cacheKey}.png`, base64Image) : urlImage;
    if (!imageUrl) throw new Error("OpenAI image generation completed without an image output.");

    await pool.query(
      `INSERT INTO generated_looks (
         designer_id, model_template_id, selected_product_ids, cache_key, prompt, image_url, provider, cache_hit, status
       )
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, 'openai', false, 'hidden')
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
