import { requireUser } from "@/lib/auth";
import { deleteGeneratedLook, updateGeneratedLookForAdmin } from "@/lib/db";
import type { GeneratedLookStatus } from "@/lib/types";

const validStatuses: GeneratedLookStatus[] = ["generated", "approved", "rejected", "hidden"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = validStatuses.includes(body.status) ? body.status : undefined;

  if (!status) {
    return Response.json({ ok: false, error: "Valid status is required." }, { status: 400 });
  }

  const generatedLook = await updateGeneratedLookForAdmin(id, { status });
  if (!generatedLook) return Response.json({ ok: false, error: "Generated look not found." }, { status: 404 });
  return Response.json({ ok: true, generatedLook });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const deleted = await deleteGeneratedLook(id);
  if (!deleted) return Response.json({ ok: false, error: "Generated look not found." }, { status: 404 });
  return Response.json({ ok: true });
}
