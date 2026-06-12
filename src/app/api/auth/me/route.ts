// 현재 세션 사용자 조회: 디자이너면 승인 상태까지 함께 반환 (공개 헤더의 메뉴 분기용)
import { getCurrentUser } from "@/lib/auth";
import { getDesignerForUser } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: true, user: null, designer: null });

  let designer = null;
  if (user.role === "designer") {
    try {
      const row = await getDesignerForUser(user.id);
      if (row) {
        designer = { id: row.id, brandName: row.brand_name, approvalStatus: row.approval_status };
      }
    } catch {
      // 조회 실패 시 디자이너 정보 없이 사용자만 반환
    }
  }

  return Response.json({ ok: true, user, designer });
}
