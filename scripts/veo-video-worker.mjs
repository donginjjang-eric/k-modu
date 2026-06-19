// 승인된 AI 룩 이미지를 Google Veo 3.1(fast/Lite) image-to-video로 변환해 숏폼 MP4로 저장하는 백그라운드 워커.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Pool } from "pg";

const projectRoot = process.cwd();
const assetsRoot = path.join(projectRoot, "assets");
const dataRoot = process.env.DATA_DIR || (process.env.RAILWAY_ENVIRONMENT ? "/data" : path.join(projectRoot, ".runtime"));
const roots = {
  generatedLooks: path.join(dataRoot, "generated-looks"),
};
const contentTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const VEO_MODEL = process.env.VEO_MODEL || "veo-3.1-fast-generate-preview";
const VEO_ASPECT_RATIO = process.env.VEO_ASPECT_RATIO || "9:16";
const POLL_INTERVAL_MS = Number(process.env.VEO_POLL_INTERVAL_MS || 10000);
const POLL_MAX_TRIES = Number(process.env.VEO_POLL_MAX_TRIES || 42); // 약 7분

// ── fal.ai Kling image-to-video (Veo 대체용). FAL_KEY가 있으면 이걸 우선 사용 ──
const FAL_MODEL = process.env.FAL_MODEL || "fal-ai/kling-video/v2.1/standard/image-to-video";
const FAL_DURATION = process.env.FAL_DURATION || "5"; // "5" | "10"

// ── Railway 버킷(S3) 경량 미러 (storage.ts와 동일 규칙) ──
const bucketKeyPrefixes = { generatedLooks: "generated-looks" };
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
async function saveGeneratedVideo(fileName, bytes) {
  const safeFileName = path.basename(fileName).replace(/[^a-z0-9._-]/gi, "-");
  if (hasBucket()) {
    await getS3().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `${bucketKeyPrefixes.generatedLooks}/${safeFileName}`,
      Body: bytes,
      ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000, immutable",
    }));
  } else {
    mkdirSync(roots.generatedLooks, { recursive: true });
    writeFileSync(path.join(roots.generatedLooks, safeFileName), bytes);
  }
  return `/generated-looks/${safeFileName}`;
}

// 룩 이미지(/generated-looks/x.png, assets/…)를 base64+mime로 로드
async function loadImageBase64(imagePath) {
  const normalized = String(imagePath || "").replace(/^\/+/, "");
  const ext = path.extname(normalized).toLowerCase();
  const mimeType = contentTypes[ext] || "image/png";

  if (normalized.startsWith("assets/")) {
    const filePath = path.join(assetsRoot, normalized.slice("assets/".length));
    if (filePath.startsWith(assetsRoot) && existsSync(filePath)) {
      return { base64: readFileSync(filePath).toString("base64"), mimeType };
    }
  }
  if (normalized.startsWith("generated-looks/")) {
    const filePath = path.join(roots.generatedLooks, path.basename(normalized));
    if (filePath.startsWith(roots.generatedLooks) && existsSync(filePath)) {
      return { base64: readFileSync(filePath).toString("base64"), mimeType };
    }
    const bytes = await getBucketObjectBytes("generatedLooks", path.basename(normalized));
    if (bytes) return { base64: bytes.toString("base64"), mimeType };
  }
  if (/^https?:\/\//i.test(imagePath)) {
    const res = await fetch(imagePath);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      return { base64: buf.toString("base64"), mimeType: res.headers.get("content-type") || mimeType };
    }
  }
  throw new Error(`Look image not found: ${imagePath}`);
}

// done된 operation 응답에서 영상(base64 우선, 없으면 download uri)을 깊이 탐색으로 추출
function extractVideo(node, found = { base64: null, uri: null }) {
  if (!node || typeof node !== "object" || (found.base64 && found.uri)) return found;
  for (const [key, value] of Object.entries(node)) {
    if (!value) continue;
    if (typeof value === "string") {
      if (!found.base64 && (key === "bytesBase64Encoded" || key === "encodedVideo" || key === "videoBytes")) found.base64 = value;
      if (!found.uri && (key === "uri" || key === "videoUri" || key === "fileUri" || key === "downloadUri")) found.uri = value;
    } else if (typeof value === "object") {
      extractVideo(value, found);
    }
  }
  return found;
}

function decodePayload() {
  const raw = process.argv[2];
  if (!raw) throw new Error("Worker payload is required.");
  return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateVeoVideo({ prompt, base64, mimeType }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const startRes = await fetch(`${GEMINI_BASE}/models/${VEO_MODEL}:predictLongRunning?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt, image: { bytesBase64Encoded: base64, mimeType } }],
      parameters: { aspectRatio: VEO_ASPECT_RATIO },
    }),
  });
  if (!startRes.ok) {
    throw new Error(`Veo start failed ${startRes.status}: ${(await startRes.text()).slice(0, 240)}`);
  }
  const opName = (await startRes.json())?.name;
  if (!opName) throw new Error("Veo did not return an operation name.");

  for (let i = 0; i < POLL_MAX_TRIES; i += 1) {
    await sleep(POLL_INTERVAL_MS);
    const pollRes = await fetch(`${GEMINI_BASE}/${opName}?key=${apiKey}`);
    if (!pollRes.ok) continue;
    const op = await pollRes.json();
    if (op.error) throw new Error(`Veo operation error: ${op.error.message || JSON.stringify(op.error)}`);
    if (!op.done) continue;

    const { base64: outB64, uri } = extractVideo(op.response || op);
    if (outB64) return Buffer.from(outB64, "base64");
    if (uri) {
      const dl = await fetch(uri.includes("key=") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}key=${apiKey}`);
      if (!dl.ok) throw new Error(`Veo video download failed ${dl.status}`);
      return Buffer.from(await dl.arrayBuffer());
    }
    throw new Error("Veo finished but returned no video data.");
  }
  throw new Error("Veo generation timed out.");
}

// fal.ai 큐 API: 제출 → 상태 폴링 → 결과(video.url) 다운로드. 입력 이미지는 base64 data URI로 전달.
async function generateKlingVideo({ prompt, base64, mimeType }) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not configured.");
  const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };
  const imageDataUri = `data:${mimeType};base64,${base64}`;

  const submitRes = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt, image_url: imageDataUri, duration: FAL_DURATION }),
  });
  if (!submitRes.ok) {
    throw new Error(`Fal submit failed ${submitRes.status}: ${(await submitRes.text()).slice(0, 280)}`);
  }
  const submit = await submitRes.json();
  const requestId = submit.request_id;
  if (!requestId) throw new Error("Fal did not return a request_id.");
  const statusUrl = submit.status_url || `https://queue.fal.run/${FAL_MODEL}/requests/${requestId}/status`;
  const responseUrl = submit.response_url || `https://queue.fal.run/${FAL_MODEL}/requests/${requestId}`;

  for (let i = 0; i < POLL_MAX_TRIES; i += 1) {
    await sleep(POLL_INTERVAL_MS);
    const sres = await fetch(statusUrl, { headers });
    if (!sres.ok) continue;
    const s = await sres.json();
    if (s.status === "COMPLETED") {
      const rres = await fetch(responseUrl, { headers });
      if (!rres.ok) throw new Error(`Fal result fetch failed ${rres.status}`);
      const out = await rres.json();
      const url = out?.video?.url || extractVideo(out).uri;
      if (!url) throw new Error("Fal completed but returned no video URL.");
      const dl = await fetch(url);
      if (!dl.ok) throw new Error(`Fal video download failed ${dl.status}`);
      return Buffer.from(await dl.arrayBuffer());
    }
    if (s.status === "FAILED" || s.status === "ERROR") {
      throw new Error(`Fal generation failed: ${JSON.stringify(s).slice(0, 280)}`);
    }
  }
  throw new Error("Fal generation timed out.");
}

async function main() {
  const input = decodePayload();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("railway") && !process.env.DATABASE_URL.includes(".railway.internal")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  // FAL_KEY가 있으면 Kling, 없으면 기존 Veo로 폴백
  const useFal = Boolean(process.env.FAL_KEY);
  const provider = useFal ? "fal-kling" : "google-veo";

  try {
    await pool.query("UPDATE generated_looks SET video_status = 'processing', updated_at = now() WHERE id = $1", [input.lookId]);

    const { base64, mimeType } = await loadImageBase64(input.imageUrl);
    const videoBytes = useFal
      ? await generateKlingVideo({ prompt: input.prompt, base64, mimeType })
      : await generateVeoVideo({ prompt: input.prompt, base64, mimeType });
    const videoUrl = await saveGeneratedVideo(`look-${input.lookId}.mp4`, videoBytes);

    await pool.query(
      "UPDATE generated_looks SET video_url = $2, video_status = 'completed', updated_at = now() WHERE id = $1",
      [input.lookId, videoUrl],
    );
    await pool.query(
      `INSERT INTO generation_logs (user_id, designer_id, provider, cache_key, cache_hit, status, error_message)
       VALUES ($1, $2, $4, $3, false, 'generated', null)`,
      [input.userId || null, input.designerId || null, `veo:${input.lookId}`, provider],
    );
    console.log(JSON.stringify({ ok: true, provider, lookId: input.lookId, videoUrl }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown video error";
    console.error(JSON.stringify({ ok: false, provider, lookId: input.lookId, error: message }));
    await pool.query("UPDATE generated_looks SET video_status = 'failed', updated_at = now() WHERE id = $1", [input.lookId]).catch(() => {});
    await pool.query(
      `INSERT INTO generation_logs (user_id, designer_id, provider, cache_key, cache_hit, status, error_message)
       VALUES ($1, $2, $5, $3, false, 'failed', $4)`,
      [input.userId || null, input.designerId || null, `veo:${input.lookId}`, message, provider],
    ).catch(() => {});
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
