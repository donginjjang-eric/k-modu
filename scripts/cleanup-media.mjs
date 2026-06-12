// 미디어 정리 도구: 기본은 리포트만(삭제 없음), --apply를 줘야 실제 삭제.
// 대상: ① 30일 넘게 rejected/hidden 상태인 AI 룩의 파일+행 ② DB가 모르는 고아 generated-looks 버킷 객체.
// 부팅 체인에서 리포트 모드로 실행돼 배포 때마다 용량 현황이 로그에 남는다. 항상 exit 0.
import path from "node:path";
import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";

const apply = process.argv.includes("--apply");

try {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !process.env.S3_BUCKET) {
    console.log("[cleanup] DB 또는 버킷 미설정, 건너뜀");
    process.exit(0);
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("railway") && !databaseUrl.includes(".railway.internal")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const s3 = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });

  // ① 오래된 거부/숨김 룩
  const stale = await pool.query(
    `SELECT id, image_url FROM generated_looks
      WHERE status IN ('rejected', 'hidden')
        AND updated_at < now() - interval '30 days'`,
  );

  // ② 버킷의 고아 generated-looks 객체 (DB 어떤 행도 참조하지 않는 파일)
  const known = await pool.query(`SELECT image_url FROM generated_looks`);
  const knownNames = new Set(
    known.rows.map((row) => path.basename(String(row.image_url || ""))).filter(Boolean),
  );
  const listed = await s3.send(new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET,
    Prefix: "generated-looks/",
    MaxKeys: 1000,
  }));
  const orphans = (listed.Contents || [])
    .map((object) => object.Key || "")
    .filter((key) => key && !knownNames.has(path.basename(key)));

  console.log(`[cleanup] 오래된 거부/숨김 룩: ${stale.rowCount}건, 고아 버킷 객체: ${orphans.length}건 (apply=${apply})`);

  if (apply) {
    for (const row of stale.rows) {
      const fileName = path.basename(String(row.image_url || ""));
      if (fileName) {
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: `generated-looks/${fileName}` })).catch(() => {});
      }
      await pool.query("DELETE FROM generated_looks WHERE id = $1", [row.id]);
    }
    for (const key of orphans) {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })).catch(() => {});
    }
    console.log(`[cleanup] 삭제 완료: 룩 ${stale.rowCount}건 + 고아 ${orphans.length}건`);
  }

  await pool.end();
} catch (error) {
  console.error("[cleanup] failed:", error?.message || error);
}
process.exit(0);
