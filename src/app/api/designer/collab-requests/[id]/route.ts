// 디자이너: 받은 의뢰 상태 변경 (new/read/done) — 본인 의뢰만
import { getApprovedDesignerForApi } from "@/lib/auth";
import { updateCollabRequestStatus } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status === "read" || body.status === "done" || body.status === "new" ? body.status : null;
  if (!status) {
    return Response.json({ ok: false, error: "status must be new, read, or done." }, { status: 400 });
  }

  const updated = await updateCollabRequestStatus(id, auth.designer.id, status);
  if (!updated) {
    return Response.json({ ok: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }
  return Response.json({ ok: true, request: updated });
}
