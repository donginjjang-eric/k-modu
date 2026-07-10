import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

const assetsRoot = path.join(/* turbopackIgnore: true */ process.cwd(), "assets");
const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

function assetHeaders(filePath: string) {
  const stats = statSync(filePath);
  const etag = `W/\"${stats.size.toString(16)}-${Math.trunc(stats.mtimeMs).toString(16)}\"`;
  const hasContentHash = /(?:^|[-_.])[a-f0-9]{8,}(?:[-_.]|$)/i.test(path.basename(filePath));
  return {
    stats,
    etag,
    headers: {
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": String(stats.size),
      "Cache-Control": hasContentHash
        ? "public, max-age=31536000, immutable"
        : "public, max-age=86400, stale-while-revalidate=604800",
      "Last-Modified": stats.mtime.toUTCString(),
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  };
}

async function resolveAsset(params: Promise<{ path: string[] }>) {
  const { path: segments } = await params;
  const safeSegments = segments.map((segment) => path.basename(segment));
  const filePath = path.join(/* turbopackIgnore: true */ assetsRoot, ...safeSegments);
  if (!filePath.startsWith(assetsRoot) || !existsSync(filePath)) {
    return null;
  }
  return filePath;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const filePath = await resolveAsset(params);
  if (!filePath) return new Response("Not found", { status: 404 });
  const { etag, headers } = assetHeaders(filePath);
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(createReadStream(filePath) as unknown as BodyInit, {
    headers,
  });
}

export async function HEAD(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const filePath = await resolveAsset(params);
  if (!filePath) return new Response(null, { status: 404 });
  return new Response(null, { headers: assetHeaders(filePath).headers });
}
