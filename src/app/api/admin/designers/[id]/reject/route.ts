// 디자이너 신청 거절: 운영 중 정지(disabled)와 구분되는 '반려(rejected)' 상태로 기록
import { requireUser } from "@/lib/auth";
import { updateDesignerApprovalStatus } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const designer = await updateDesignerApprovalStatus(id, "rejected");
  if (!designer) return Response.json({ ok: false, error: "Designer not found." }, { status: 404 });
  return Response.json({ ok: true, designer });
}
