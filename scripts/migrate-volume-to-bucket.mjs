// 볼륨(/data)의 업로드·생성 이미지들을 Railway 버킷으로 일괄 이관하는 스크립트.
// 서버에서 실행해야 한다 (볼륨이 서버에만 있음): railway ssh -- node scripts/migrate-volume-to-bucket.mjs
// 이관 후에도 볼륨 파일은 지우지 않는다 (서빙은 볼륨 우선이라 안전). 검증 후 별도 정리.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const dataRoot = process.env.DATA_DIR || "/data";
const targets = [
  { dir: path.join(dataRoot, "uploads", "products"), prefix: "uploads/products" },
  { dir: path.join(dataRoot, "uploads", "portfolio"), prefix: "uploads/portfolio" },
  { dir: path.join(dataRoot, "generated-looks"), prefix: "generated-looks" },
  { dir: path.join(dataRoot, "model-templates"), prefix: "model-templates" },
];
const contentTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

if (!process.env.S3_BUCKET) {
  console.log("S3_BUCKET not configured");
  process.exit(1);
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
    console.log(`up: ${prefix}/${file} (${(bytes.length / 1024).toFixed(0)}KB)`);
  }
}
console.log(`done. uploaded=${uploaded} skipped=${skipped}`);
