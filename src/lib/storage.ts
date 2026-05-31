import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const dataRoot = process.env.DATA_DIR || (process.env.RAILWAY_ENVIRONMENT ? "/data" : path.join(/*turbopackIgnore: true*/ process.cwd(), ".runtime"));

const roots = {
  productUploads: path.join(dataRoot, "uploads", "products"),
  generatedLooks: path.join(dataRoot, "generated-looks"),
  modelTemplates: path.join(dataRoot, "model-templates"),
};

const imageMimeToExt: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export type StorageKind = keyof typeof roots;

export function ensureStorage() {
  Object.values(roots).forEach((dir) => mkdirSync(dir, { recursive: true }));
}

export function getStorageRoot(kind: StorageKind) {
  return roots[kind];
}

export function getImageHash(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function validateImageUpload(input: { mimeType: string; byteLength: number }) {
  const maxBytes = Number(process.env.MAX_IMAGE_UPLOAD_BYTES || 8 * 1024 * 1024);
  const ext = imageMimeToExt[input.mimeType];
  if (!ext) throw new Error("Only jpg, jpeg, png, and webp images are allowed.");
  if (input.byteLength > maxBytes) throw new Error(`Image must be ${Math.round(maxBytes / 1024 / 1024)}MB or smaller.`);
  return ext;
}

export function saveStorageImage(kind: StorageKind, bytes: Buffer, mimeType: string) {
  ensureStorage();
  const ext = validateImageUpload({ mimeType, byteLength: bytes.length });
  const fileName = `${randomUUID()}${ext}`;
  const filePath = path.join(roots[kind], fileName);
  writeFileSync(filePath, bytes);

  if (kind === "productUploads") return { url: `/uploads/products/${fileName}`, imageHash: getImageHash(bytes) };
  if (kind === "generatedLooks") return { url: `/generated-looks/${fileName}`, imageHash: getImageHash(bytes) };
  return { url: `/model-templates/${fileName}`, imageHash: getImageHash(bytes) };
}

export function resolveStoredFile(kind: StorageKind, fileName: string) {
  const safeFileName = path.basename(fileName);
  const filePath = path.join(roots[kind], safeFileName);
  if (!filePath.startsWith(roots[kind]) || !existsSync(filePath)) return null;
  return filePath;
}

export function streamStoredFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return new Response(createReadStream(filePath) as unknown as BodyInit, {
    headers: {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function readImageFormFile(request: Request, fieldName = "image") {
  const form = await request.formData();
  const file = form.get(fieldName);
  if (!(file instanceof File)) {
    throw new Error(`${fieldName} is required.`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  validateImageUpload({ mimeType: file.type, byteLength: bytes.length });
  return {
    file,
    bytes,
    mimeType: file.type,
  };
}
