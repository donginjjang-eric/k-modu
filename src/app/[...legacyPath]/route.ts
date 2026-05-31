import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const legacyContentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const legacyFiles = new Set([
  "admin.html",
  "apply-complete.html",
  "apply.html",
  "brand-detail.html",
  "consumer-products-live-after-zero-filter.json",
  "creator-detail.html",
  "creators.html",
  "designer-brief.html",
  "designer-match.html",
  "designers.html",
  "index.html",
  "login.html",
  "platform.css",
]);

export async function GET(_: Request, { params }: { params: Promise<{ legacyPath: string[] }> }) {
  const { legacyPath } = await params;
  const legacyName = legacyPath.join("/");

  if (!legacyFiles.has(legacyName)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), legacyName);
  if (!existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  return new Response(readFileSync(filePath), {
    headers: {
      "Content-Type": legacyContentTypes[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=60",
    },
  });
}
