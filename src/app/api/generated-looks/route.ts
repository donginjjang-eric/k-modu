import { getApprovedDesignerForApi } from "@/lib/auth";
import { getGeneratedLooksForDesigner } from "@/lib/db";

export async function GET() {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { designer } = auth;
  const generatedLooks = await getGeneratedLooksForDesigner(designer.id);
  return Response.json({ ok: true, generatedLooks });
}
