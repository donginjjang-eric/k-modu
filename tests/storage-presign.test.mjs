// Railway 버킷 이미지 URL의 서명 리전을 검증한다.
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

test("Railway bucket product images are signed with the documented auto region", async () => {
  process.env.DATA_DIR = path.join(process.cwd(), "tmp", "storage-presign-test-nonexistent");
  process.env.S3_BUCKET = "test-bucket";
  process.env.S3_ENDPOINT = "https://t3.storageapi.dev";
  process.env.S3_REGION = "sin";
  process.env.S3_ACCESS_KEY_ID = "test-access-key";
  process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";

  const { serveStoredMedia } = await import("../src/lib/storage.ts");
  const response = await serveStoredMedia("productUploads", "missing-test-image.png");
  assert.equal(response.status, 302);
  const url = new URL(response.headers.get("location"));
  assert.equal(url.hostname, "test-bucket.t3.storageapi.dev");
  assert.equal(url.searchParams.get("X-Amz-Credential")?.split("/")[2], "auto");
});
