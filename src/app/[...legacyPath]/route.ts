import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const legacyContentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const legacyFiles = new Set([
  "apply-complete.html",
  "apply.html",
  "auth-nav.js",
  "brand-detail.html",
  "consumer-products-live-after-zero-filter.json",
  "creator-detail.html",
  "creators.html",
  "designer-brief.html",
  "designer-match.html",
  "designers.html",
  "index.html",
  "platform.css",
  "privacy-policy.html",
  "robots.txt",
  "sitemap.xml",
  "terms.html",
]);

// admin.html / designer-studio.html / login.html은 삭제된 파일 — 아래 307 리다이렉트의 마커로만 쓰인다 (옛 링크 호환)
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
  "designer_studio": "designer-studio.html",
  "studio": "designer-studio.html",
  "designers": "designers.html",
  "legacy-login": "login.html",
  "privacy-policy": "privacy-policy.html",
  "terms": "terms.html",
};

export async function GET(_: Request, { params }: { params: Promise<{ legacyPath: string[] }> }) {
  const { legacyPath } = await params;
  const requestedPath = legacyPath.join("/");
  const legacyName = cleanLegacyRoutes[requestedPath] || requestedPath;

  if (legacyName === "designer-studio.html") {
    return new Response(null, { status: 307, headers: { Location: "/dashboard/designer" } });
  }
  if (legacyName === "admin.html") {
    return new Response(null, { status: 307, headers: { Location: "/dashboard/admin" } });
  }
  // 옛 로그인 페이지는 구글 로그인이 있는 새 로그인으로 보낸다.
  if (legacyName === "login.html") {
    return new Response(null, { status: 307, headers: { Location: "/login" } });
  }

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
