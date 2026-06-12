// 버킷의 최신 생성 룩 이미지에서 하단 흰 띠 여부를 픽셀로 검사하는 일회성 진단 스크립트 (읽기 전용)
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const endpoint = process.env.S3_ENDPOINT;
const bucket = process.env.S3_BUCKET;
const client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000 }));
const objects = (list.Contents || [])
  .filter((o) => /\.(png|jpg|jpeg|webp)$/i.test(o.Key))
  .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
  .slice(0, 6);

for (const obj of objects) {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: obj.Key }));
  const bytes = Buffer.from(await res.Body.transformToByteArray());
  const img = sharp(bytes);
  const meta = await img.metadata();
  // 하단 5% 스트립의 평균 밝기
  const stripH = Math.max(4, Math.round(meta.height * 0.05));
  const strip = await img
    .extract({ left: 0, top: meta.height - stripH, width: meta.width, height: stripH })
    .stats();
  const mean = strip.channels.slice(0, 3).map((c) => Math.round(c.mean));
  const isWhite = mean.every((v) => v > 240);
  console.log(`${obj.Key} | ${meta.width}x${meta.height} (${(meta.width / meta.height).toFixed(3)}) | ${obj.LastModified.toISOString().slice(0, 16)} | 하단5% RGB=${mean.join(",")} ${isWhite ? "← 흰 띠!" : ""}`);
}
