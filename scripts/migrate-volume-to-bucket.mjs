// 볼륨(/data)의 업로드·생성 이미지들을 Railway 버킷으로 일괄 이관하는 스크립트.
// 서버 부팅 시(start 스크립트) 1회 실행되고, 완료 마커가 있으면 즉시 통과한다.
// 이관 후에도 볼륨 파일은 지우지 않는다 (서빙은 볼륨 우선이라 안전). 검증 후 별도 정리.
// 어떤 경우에도 exit 0 — 이관 실패가 앱 기동을 막으면 안 된다.
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const dataRoot = process.env.DATA_DIR || (process.env.RAILWAY_ENVIRONMENT ? "/data" : path.join(process.cwd(), ".runtime"));
const markerPath = path.join(dataRoot, ".migrated-to-bucket");
const targets = [
  { dir: path.join(dataRoot, "uploads", "products"), prefix: "uploads/products" },
  { dir: path.join(dataRoot, "uploads", "portfolio"), prefix: "uploads/portfolio" },
  { dir: path.join(dataRoot, "generated-looks"), prefix: "generated-looks" },
  { dir: path.join(dataRoot, "model-templates"), prefix: "model-templates" },
];
const contentTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

try {
  if (!process.env.S3_BUCKET) {
    console.log("[migrate] S3_BUCKET not configured, skipping");
    process.exit(0);
  }
  if (existsSync(markerPath)) {
    console.log("[migrate] already migrated, skipping");
    process.exit(0);
  }

  const s3 = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });

  let uploaded = 0;
  let skipped = 0;
  for (const { dir, prefix } of targets) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      const ext = path.extname(file).toLowerCase();
      if (!contentTypes[ext]) { skipped += 1; continue; }
      const bytes = readFileSync(path.join(dir, file));
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `${prefix}/${file}`,
        Body: bytes,
        ContentType: contentTypes[ext],
        CacheControl: "public, max-age=31536000, immutable",
      }));
      uploaded += 1;
      console.log(`[migrate] up: ${prefix}/${file} (${(bytes.length / 1024).toFixed(0)}KB)`);
    }
  }

  writeFileSync(markerPath, new Date().toISOString());
  console.log(`[migrate] done. uploaded=${uploaded} skipped=${skipped}`);
} catch (error) {
  console.error("[migrate] failed (app will still start):", error?.message || error);
}
process.exit(0);
