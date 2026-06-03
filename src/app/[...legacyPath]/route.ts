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
  "designer-studio.html",
  "designers.html",
  "index.html",
  "login.html",
  "platform.css",
]);

const cleanLegacyRoutes: Record<string, string> = {
  "admin": "admin.html",
  "apply": "apply.html",
  "apply-complete": "apply-complete.html",
  "brand-detail": "brand-detail.html",
  "creator-detail": "creator-detail.html",
  "creators": "creators.html",
  "designer-brief": "designer-brief.html",
  "designer-match": "designer-match.html",
  "designer-studio": "designer-studio.html",
  "designers": "designers.html",
  "legacy-login": "login.html",
};

export async function GET(_: Request, { params }: { params: Promise<{ legacyPath: string[] }> }) {
  const { legacyPath } = await params;
  const requestedPath = legacyPath.join("/");
  const legacyName = cleanLegacyRoutes[requestedPath] || requestedPath;

  if (!legacyFiles.has(legacyName)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), legacyName);
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
