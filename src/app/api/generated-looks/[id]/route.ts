import { getApprovedDesignerForApi } from "@/lib/auth";
import { getGeneratedLookForDesigner, updateGeneratedLookForDesigner } from "@/lib/db";
import type { GeneratedLookStatus } from "@/lib/types";

const designerStatuses: GeneratedLookStatus[] = ["generated", "hidden"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const { id } = await params;
  const generatedLook = await getGeneratedLookForDesigner(designer.id, id);
  if (!generatedLook) return Response.json({ ok: false, error: "Generated look not found." }, { status: 404 });
  return Response.json({ ok: true, generatedLook });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = designerStatuses.includes(body.status) ? body.status : undefined;

  if (!status) {
    return Response.json({ ok: false, error: "Valid status is required." }, { status: 400 });
  }

  const generatedLook = await updateGeneratedLookForDesigner(designer.id, id, { status });
  if (!generatedLook) return Response.json({ ok: false, error: "Generated look not found." }, { status: 404 });
  return Response.json({ ok: true, generatedLook });
}
