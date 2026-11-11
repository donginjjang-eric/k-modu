import { requireUser } from "@/lib/auth";
import { updateProductForAdmin } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser("admin");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = ["draft", "active", "hidden"].includes(body.status) ? body.status : undefined;
  const approvalStatus = ["pending", "approved", "rejected", "disabled"].includes(body.approvalStatus) ? body.approvalStatus : undefined;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!status && !approvalStatus) {
    return Response.json({ ok: false, error: "Valid status or approvalStatus is required." }, { status: 400 });
  }
  if (approvalStatus === "disabled" && (!reason || reason.length > 500)) {
    return Response.json({ ok: false, error: "비공개 사유를 500자 이내로 입력해 주세요." }, { status: 400 });
  }

  const product = await updateProductForAdmin(id, { status, approvalStatus, reason }, actor.id);
  if (!product) return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  return Response.json({ ok: true, product });
}
