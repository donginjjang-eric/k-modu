import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

const root = process.cwd();
const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const safeSegments = segments.map((segment) => path.basename(segment));
  const filePath = path.join(root, "assets", ...safeSegments);
  const assetsRoot = path.join(root, "assets");
  if (!filePath.startsWith(assetsRoot) || !existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  return new Response(createReadStream(filePath) as unknown as BodyInit, {
    headers: {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
