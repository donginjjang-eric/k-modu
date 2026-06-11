import { getApprovedDesignerForApi } from "@/lib/auth";
import { createPortfolioImageForDesigner, getPortfolioImagesForDesigner } from "@/lib/db";
import type { PortfolioImageKind } from "@/lib/types";

const KINDS: PortfolioImageKind[] = ["profile", "lookbook", "product", "sample"];

export async function GET() {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const images = await getPortfolioImagesForDesigner(designer.id);
  return Response.json({ ok: true, images });
}

export async function POST(request: Request) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const body = await request.json().catch(() => ({}));
  const imageUrl = String(body.imageUrl || "").trim();
  const title = String(body.title || "").trim();
  const kind = String(body.kind || "lookbook") as PortfolioImageKind;

  if (!imageUrl) return Response.json({ ok: false, error: "imageUrl is required." }, { status: 400 });
  if (!KINDS.includes(kind)) return Response.json({ ok: false, error: "Invalid image kind." }, { status: 400 });

  const image = await createPortfolioImageForDesigner({
    designerId: designer.id,
    title,
    kind,
    imageUrl,
    imageHash: body.imageHash || null,
  });

  return Response.json({ ok: true, image });
}
