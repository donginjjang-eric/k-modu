import { requireUser } from "@/lib/auth";
import { updateDesignerApprovalStatus } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const designer = await updateDesignerApprovalStatus(id, "disabled");
  if (!designer) return Response.json({ ok: false, error: "Designer not found." }, { status: 404 });
  return Response.json({ ok: true, designer });
}
