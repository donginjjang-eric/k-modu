import { getApprovedDesignerForApi } from "@/lib/auth";
import { hideGeneratedLookForDesigner } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const { id } = await params;
  const generatedLook = await hideGeneratedLookForDesigner(designer.id, id);
  if (!generatedLook) return Response.json({ ok: false, error: "Generated look not found." }, { status: 404 });
  return Response.json({ ok: true, generatedLook });
}
