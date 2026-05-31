import { requireApprovedDesigner } from "@/lib/auth";
import { getGeneratedLooksForDesigner } from "@/lib/db";

export async function GET() {
  const { designer } = await requireApprovedDesigner();
  const generatedLooks = await getGeneratedLooksForDesigner(designer.id);
  return Response.json({ ok: true, generatedLooks });
}
