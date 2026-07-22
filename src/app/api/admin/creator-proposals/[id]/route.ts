import { requireUser } from "@/lib/auth";
import { updateCreatorCollabProposalStatus } from "@/lib/db";
import type { CreatorProposalStatus } from "@/lib/types";

const VALID_STATUSES = new Set<CreatorProposalStatus>(["new", "contacted", "negotiating", "matched", "closed"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body && typeof body === "object" ? (body as { status?: CreatorProposalStatus }).status : undefined;

  if (!status || !VALID_STATUSES.has(status)) {
    return Response.json({ ok: false, error: "유효한 처리 상태가 필요합니다." }, { status: 400 });
  }

  const proposal = await updateCreatorCollabProposalStatus(id, status);
  if (!proposal) {
    return Response.json({ ok: false, error: "협업 제안을 찾을 수 없습니다." }, { status: 404 });
  }
  return Response.json({ ok: true, proposal });
}
