import { getApprovedDesignerForApi } from "@/lib/auth";
import { updatePortfolioImageForDesigner } from "@/lib/db";
import type { PortfolioImageKind, PortfolioImageStatus } from "@/lib/types";

const KINDS: PortfolioImageKind[] = ["profile", "lookbook", "product", "sample"];
// 등록 시 자동 공개(approved)되는 정책이므로, 비공개 전환 후 본인이 다시 공개하는 것도 허용한다
const DESIGNER_STATUSES: PortfolioImageStatus[] = ["pending", "approved", "hidden"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status ? String(body.status) as PortfolioImageStatus : undefined;
  const kind = body.kind ? String(body.kind) as PortfolioImageKind : undefined;

  if (status && !DESIGNER_STATUSES.includes(status)) {
    return Response.json({ ok: false, error: "Invalid status." }, { status: 400 });
  }
  if (kind && !KINDS.includes(kind)) {
    return Response.json({ ok: false, error: "Invalid image kind." }, { status: 400 });
  }

  const image = await updatePortfolioImageForDesigner(designer.id, id, {
    title: body.title === undefined ? undefined : String(body.title || "").trim(),
    kind,
    status,
  });
  if (!image) return Response.json({ ok: false, error: "Portfolio image not found." }, { status: 404 });
  return Response.json({ ok: true, image });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const { id } = await params;
  const image = await updatePortfolioImageForDesigner(designer.id, id, { status: "hidden" });
  if (!image) return Response.json({ ok: false, error: "Portfolio image not found." }, { status: 404 });
  return Response.json({ ok: true, image });
}
