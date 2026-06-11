import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const MAX_EDGE = 1600;

// 업로드 이미지를 표시 크기로 리사이즈 + 재압축 (디자이너가 용량 신경 안 쓰게).
// 실패 시 원본 유지. 결과가 더 크면 원본 유지.
async function optimizeImage(bytes: Buffer, ext: string): Promise<Buffer> {
  try {
    let img = sharp(bytes, { failOn: "none" }).rotate();
    const meta = await img.metadata();
    if ((meta.width || 0) > MAX_EDGE || (meta.height || 0) > MAX_EDGE) {
      img = img.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
    }
    if (ext === ".png") img = img.png({ compressionLevel: 9, palette: true, quality: 82, effort: 8 });
    else if (ext === ".webp") img = img.webp({ quality: 82 });
    else img = img.jpeg({ quality: 80, mozjpeg: true });
    const out = await img.toBuffer();
    return out.length < bytes.length ? out : bytes;
  } catch {
    return bytes;
  }
}

const projectRoot = /* turbopackIgnore: true */ process.cwd();
const assetsRoot = path.join(projectRoot, "assets");
const dataRoot = process.env.DATA_DIR || (process.env.RAILWAY_ENVIRONMENT ? "/data" : path.join(projectRoot, ".runtime"));

const roots = {
  productUploads: path.join(dataRoot, "uploads", "products"),
  portfolioUploads: path.join(dataRoot, "uploads", "portfolio"),
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

export async function saveStorageImage(kind: StorageKind, bytes: Buffer, mimeType: string) {
  ensureStorage();
  const ext = validateImageUpload({ mimeType, byteLength: bytes.length });
  const optimized = await optimizeImage(bytes, ext);
  const fileName = `${randomUUID()}${ext}`;
  const filePath = path.join(/* turbopackIgnore: true */ roots[kind], fileName);
  writeFileSync(filePath, optimized);
  const imageHash = getImageHash(optimized);

  if (kind === "productUploads") return { url: `/uploads/products/${fileName}`, imageHash };
  if (kind === "portfolioUploads") return { url: `/uploads/portfolio/${fileName}`, imageHash };
  if (kind === "generatedLooks") return { url: `/generated-looks/${fileName}`, imageHash };
  return { url: `/model-templates/${fileName}`, imageHash };
}

export function saveGeneratedPng(fileName: string, base64Image: string) {
  ensureStorage();
  const safeFileName = path.basename(fileName).replace(/[^a-z0-9._-]/gi, "-");
  const filePath = path.join(/* turbopackIgnore: true */ roots.generatedLooks, safeFileName);
  const bytes = Buffer.from(base64Image, "base64");
  writeFileSync(filePath, bytes);
  return {
    url: `/generated-looks/${safeFileName}`,
    imageHash: getImageHash(bytes),
  };
}

export function readPublicImageAsDataUrl(imagePath: string) {
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith("data:")) return imagePath;

  const normalized = imagePath.replace(/^\/+/, "");
  let filePath = "";
  if (normalized.startsWith("assets/")) {
    filePath = path.join(assetsRoot, normalized.slice("assets/".length));
  }
  if (normalized.startsWith("uploads/products/")) {
    filePath = path.join(/* turbopackIgnore: true */ roots.productUploads, path.basename(normalized));
  }
  if (normalized.startsWith("uploads/portfolio/")) {
    filePath = path.join(/* turbopackIgnore: true */ roots.portfolioUploads, path.basename(normalized));
  }
  if (normalized.startsWith("generated-looks/")) {
    filePath = path.join(/* turbopackIgnore: true */ roots.generatedLooks, path.basename(normalized));
  }
  if (normalized.startsWith("model-templates/")) {
    filePath = path.join(/* turbopackIgnore: true */ roots.modelTemplates, path.basename(normalized));
  }

  const allowedRoots = [assetsRoot, roots.productUploads, roots.portfolioUploads, roots.generatedLooks, roots.modelTemplates];
  const isAllowed = allowedRoots.some((root) => filePath.startsWith(root));
  if (!isAllowed || !existsSync(filePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = contentTypes[ext] || "image/png";
  return `data:${mimeType};base64,${readFileSync(filePath).toString("base64")}`;
}

export function resolveStoredFile(kind: StorageKind, fileName: string) {
  const safeFileName = path.basename(fileName);
  const filePath = path.join(/* turbopackIgnore: true */ roots[kind], safeFileName);
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
