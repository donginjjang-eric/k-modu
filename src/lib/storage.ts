import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, statfsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

// ── Railway 버킷(S3 호환) 어댑터 ──
// 설정돼 있으면 업로드는 버킷으로 가고, 서빙은 presigned URL 302로 사용자에게 직접 전송된다 (버킷 egress 무료).
// 미설정(로컬 개발)이면 기존 볼륨(.runtime / /data) 경로를 그대로 쓴다. 공개 URL 형태는 두 경우 모두 동일.
const bucketKeyPrefixes: Record<StorageKind, string> = {
  productUploads: "uploads/products",
  portfolioUploads: "uploads/portfolio",
  generatedLooks: "generated-looks",
  modelTemplates: "model-templates",
};

export function hasBucket() {
  return Boolean(
    process.env.S3_BUCKET &&
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY,
  );
}

let s3Client: S3Client | null = null;
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

function bucketKey(kind: StorageKind, fileName: string) {
  return `${bucketKeyPrefixes[kind]}/${path.basename(fileName)}`;
}

async function putBucketObject(kind: StorageKind, fileName: string, bytes: Buffer, contentType: string) {
  await getS3().send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: bucketKey(kind, fileName),
    Body: bytes,
    ContentType: contentType,
    // 파일명이 UUID라 내용이 바뀔 일이 없으므로 브라우저가 1년 캐시해도 안전
    CacheControl: "public, max-age=31536000, immutable",
  }));
}

async function getBucketObjectBytes(kind: StorageKind, fileName: string): Promise<Buffer | null> {
  if (!hasBucket()) return null;
  try {
    const result = await getS3().send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: bucketKey(kind, fileName),
    }));
    const bytes = await result.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch {
    return null;
  }
}

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

// 볼륨 용량 가드: 가득 찬 디스크에 쓰다 서비스가 통째로 죽는 것을 막는다.
// 여유 공간이 예약량(기본 300MB) 미만이면 저장을 거부하고, 85% 사용 시 경고 로그를 남긴다.
const STORAGE_RESERVE_BYTES = Number(process.env.STORAGE_RESERVE_BYTES || 300 * 1024 * 1024);

function assertStorageSpace(requiredBytes: number) {
  try {
    const stats = statfsSync(dataRoot);
    const freeBytes = stats.bavail * stats.bsize;
    const totalBytes = stats.blocks * stats.bsize;
    if (totalBytes > 0 && freeBytes / totalBytes < 0.15) {
      console.warn(`[storage] volume usage above 85% (free ${(freeBytes / 1024 / 1024).toFixed(0)}MB)`);
    }
    if (freeBytes < requiredBytes + STORAGE_RESERVE_BYTES) {
      throw new Error("저장 공간이 부족합니다. 관리자에게 문의해주세요.");
    }
  } catch (error) {
    // statfs 미지원 환경(일부 로컬)에서는 가드를 건너뛴다. 부족 에러는 그대로 전달.
    if (error instanceof Error && error.message.includes("저장 공간")) throw error;
  }
}

export async function saveStorageImage(kind: StorageKind, bytes: Buffer, mimeType: string) {
  const ext = validateImageUpload({ mimeType, byteLength: bytes.length });
  const optimized = await optimizeImage(bytes, ext);
  const fileName = `${randomUUID()}${ext}`;

  if (hasBucket()) {
    await putBucketObject(kind, fileName, optimized, contentTypes[ext] || mimeType);
  } else {
    ensureStorage();
    assertStorageSpace(optimized.length);
    writeFileSync(path.join(/* turbopackIgnore: true */ roots[kind], fileName), optimized);
  }
  const imageHash = getImageHash(optimized);

  if (kind === "productUploads") return { url: `/uploads/products/${fileName}`, imageHash };
  if (kind === "portfolioUploads") return { url: `/uploads/portfolio/${fileName}`, imageHash };
  if (kind === "generatedLooks") return { url: `/generated-looks/${fileName}`, imageHash };
  return { url: `/model-templates/${fileName}`, imageHash };
}

export async function saveGeneratedPng(fileName: string, base64Image: string) {
  const safeFileName = path.basename(fileName).replace(/[^a-z0-9._-]/gi, "-");
  const bytes = Buffer.from(base64Image, "base64");

  if (hasBucket()) {
    await putBucketObject("generatedLooks", safeFileName, bytes, "image/png");
  } else {
    ensureStorage();
    assertStorageSpace(bytes.length);
    writeFileSync(path.join(/* turbopackIgnore: true */ roots.generatedLooks, safeFileName), bytes);
  }
  return {
    url: `/generated-looks/${safeFileName}`,
    imageHash: getImageHash(bytes),
  };
}

export async function readPublicImageAsDataUrl(imagePath: string) {
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith("data:")) return imagePath;

  const normalized = imagePath.replace(/^\/+/, "");
  let filePath = "";
  let kind: StorageKind | null = null;
  if (normalized.startsWith("assets/")) {
    filePath = path.join(assetsRoot, normalized.slice("assets/".length));
  }
  if (normalized.startsWith("uploads/products/")) kind = "productUploads";
  if (normalized.startsWith("uploads/portfolio/")) kind = "portfolioUploads";
  if (normalized.startsWith("generated-looks/")) kind = "generatedLooks";
  if (normalized.startsWith("model-templates/")) kind = "modelTemplates";
  if (kind) {
    filePath = path.join(/* turbopackIgnore: true */ roots[kind], path.basename(normalized));
  }

  const ext = path.extname(normalized).toLowerCase();
  const mimeType = contentTypes[ext] || "image/png";

  const allowedRoots = [assetsRoot, roots.productUploads, roots.portfolioUploads, roots.generatedLooks, roots.modelTemplates];
  const isAllowed = Boolean(filePath) && allowedRoots.some((root) => filePath.startsWith(root));
  if (isAllowed && existsSync(filePath)) {
    return `data:${mimeType};base64,${readFileSync(filePath).toString("base64")}`;
  }

  // 볼륨에 없으면 버킷에서 찾는다 (신규 업로드는 버킷에만 존재)
  if (kind) {
    const bytes = await getBucketObjectBytes(kind, path.basename(normalized));
    if (bytes) return `data:${mimeType};base64,${bytes.toString("base64")}`;
  }

  throw new Error(`Image not found: ${imagePath}`);
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

// 미디어 서빙 공통 진입점: 볼륨(레거시 파일) 우선, 없으면 버킷 presigned URL로 302.
// presign은 로컬 서명이라 버킷에 없는 키도 URL이 만들어진다 — 그 경우 버킷이 404를 응답한다.
export async function serveStoredMedia(kind: StorageKind, fileName: string) {
  const filePath = resolveStoredFile(kind, fileName);
  if (filePath) return streamStoredFile(filePath);

  if (hasBucket()) {
    try {
      const url = await getSignedUrl(
        getS3(),
        new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: bucketKey(kind, fileName) }),
        { expiresIn: 3600 },
      );
      return Response.redirect(url, 302);
    } catch {
      // presign 실패 시 404로
    }
  }
  return new Response("Not found", { status: 404 });
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
