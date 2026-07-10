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
    return value.startsWith("/uploads/")
      || value.startsWith("/assets/")
      || value.startsWith("/generated-looks/")
      || value.startsWith("/model-templates/")
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

async function addLegacyDesignerCounts(data: unknown) {
  if (!data || typeof data !== "object") return data;
  const payload = data as { counts?: unknown; designers?: Array<{ id?: string }> };
  if (payload.counts || !Array.isArray(payload.designers)) return data;

  const designerIds = payload.designers.map((designer) => designer.id).filter((id): id is string => Boolean(id));
  const productRequests = designerIds.map(async (designerId) => {
    const url = new URL("/api/public/styling-board", PRODUCTION_ORIGIN);
    url.searchParams.set("designerId", designerId);
    try {
      const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) return 0;
      const board = await response.json();
      return Array.isArray(board.products) ? board.products.length : 0;
    } catch {
      return 0;
    }
  });
  const approvedLooksRequest = fetch(new URL("/api/public/approved-looks?limit=500", PRODUCTION_ORIGIN), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  }).then((response) => response.ok ? response.json() : { looks: [] }).catch(() => ({ looks: [] }));

  const [productCounts, approvedLooks] = await Promise.all([Promise.all(productRequests), approvedLooksRequest]);
  return {
    ...payload,
    counts: {
      products: productCounts.reduce((total, count) => total + count, 0),
      designers: designerIds.length,
      generatedLooks: Array.isArray(approvedLooks.looks) ? approvedLooks.looks.length : 0,
    },
  };
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
    const compatibleData = resource === "designers" ? await addLegacyDesignerCounts(data) : data;
    return Response.json(absolutizeProductionUrls(compatibleData), {
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
