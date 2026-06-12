// 공개: 크리에이터가 디자이너에게 샘플 요청/협업 제안을 보내는 API (로그인 불필요)
import { createCollabRequest, getApprovedDesigner } from "@/lib/db";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const designerId = cleanText(payload.designerId, 80);
  const requestType = payload.type === "sample" ? "sample" as const : payload.type === "collab" ? "collab" as const : null;
  const creatorName = cleanText(payload.name, 80);
  const creatorContact = cleanText(payload.contact, 120);
  const message = cleanText(payload.message, 1000);

  if (!designerId || !requestType || !creatorName || !creatorContact) {
    return Response.json({ ok: false, error: "이름과 연락처를 입력해주세요." }, { status: 400 });
  }

  const designer = await getApprovedDesigner(designerId);
  if (!designer) {
    return Response.json({ ok: false, error: "디자이너를 찾을 수 없습니다." }, { status: 404 });
  }

  const created = await createCollabRequest({
    designer_id: designer.id,
    request_type: requestType,
    creator_name: creatorName,
    creator_contact: creatorContact,
    message,
  });
  if (!created) {
    return Response.json({ ok: false, error: "전송에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  return Response.json({ ok: true, id: created.id });
}
