import { requireUser } from "@/lib/auth";
import { withDatabaseTransaction } from "@/lib/db";
import { validateWorkspaceRouteId } from "@/lib/admin-workspace-input";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser("admin");
  const id = validateWorkspaceRouteId((await params).id);
  if (!id) return Response.json({ ok: false, error: "브랜드 ID가 올바르지 않습니다." }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason || reason.length > 500) return Response.json({ ok: false, error: "이용 중단 사유를 500자 이내로 입력해 주세요." }, { status: 400 });
  const designer = await withDatabaseTransaction(async (client) => {
    const updated = await client.query(
      "UPDATE designers SET approval_status = 'disabled', updated_at = now() WHERE id = $1 RETURNING *",
      [id],
    );
    const saved = updated.rows[0];
    if (!saved) return null;
    await client.query(
      `UPDATE user_workspace_memberships SET status = 'disabled', is_default = false, updated_at = now()
       WHERE resource_id = $1 AND workspace_type IN ('fashion_partner', 'beauty_partner')`,
      [id],
    );
    await client.query(
      `INSERT INTO creator_management_audit_logs (actor_user_id, action, metadata)
       VALUES ($1, 'brand_disabled', $2::jsonb)`,
      [actor.id, JSON.stringify({ designerId: id, reason })],
    );
    return saved;
  });
  if (!designer) return Response.json({ ok: false, error: "Designer not found." }, { status: 404 });
  return Response.json({ ok: true, designer });
}
