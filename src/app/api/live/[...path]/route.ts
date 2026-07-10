const PRODUCTION_ORIGIN = "https://www.k-modu.co.kr";

const allowedPublicResources = new Set([
  "designers",
  "designer-portfolio",
  "styling-board",
  "approved-looks",
]);

function isLocalPreview(request: Request) {
  const hostname = new URL(request.url).hostname.toLowerCase();
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "0.0.0.0"
    || hostname === "::1";
}

function absolutizeProductionUrls(value: unknown): unknown {
  if (typeof value === "string") {
    return value.startsWith("/uploads/") || value.startsWith("/assets/")
      ? `${PRODUCTION_ORIGIN}${value}`
      : value;
  }
  if (Array.isArray(value)) return value.map(absolutizeProductionUrls);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, absolutizeProductionUrls(item)]),
    );
  }
  return value;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!isLocalPreview(request)) {
    return Response.json({ ok: false, error: "Local preview only." }, { status: 404 });
  }

  const { path } = await params;
  const resource = path.join("/");
  if (!allowedPublicResources.has(resource)) {
    return Response.json({ ok: false, error: "Unsupported live resource." }, { status: 404 });
  }

  const incoming = new URL(request.url);
  const target = new URL(`/api/public/${resource}`, PRODUCTION_ORIGIN);
  target.search = incoming.search;

  try {
    const response = await fetch(target, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    return Response.json(absolutizeProductionUrls(data), {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[live-preview] production public data fetch failed:", error);
    return Response.json(
      { ok: false, error: "Production public data is unavailable." },
      { status: 502 },
    );
  }
}
