// 관리자: 디자이너별 공개 AI 생성 일일 한도 조정 API
import { requireUser } from "@/lib/auth";
import { setDesignerDailyLimit } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const limit = Number(body.limit);
  if (!Number.isFinite(limit)) {
    return Response.json({ ok: false, error: "유효한 한도 값이 필요합니다." }, { status: 400 });
  }
  const designer = await setDesignerDailyLimit(id, limit);
  if (!designer) return Response.json({ ok: false, error: "디자이너를 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ ok: true, dailyLimit: designer.daily_generation_limit });
}
