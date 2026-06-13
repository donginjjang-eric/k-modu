// 공개: 크리에이터가 디자이너에게 샘플 요청/협업 제안을 보내는 API (로그인 불필요)
import { createCollabRequest, getApprovedDesigner } from "@/lib/db";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

// 연락처는 이메일·@계정·전화(숫자 7+) 중 하나의 형태여야 한다 (가비지/빈값 스팸 차단)
function isValidContact(contact: string) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return true; // email
  if (/@[\w.]{2,}/.test(contact)) return true; // @handle / SNS
  if ((contact.match(/\d/g) || []).length >= 7) return true; // phone-ish
  return false;
}

// IP별 간단 rate limit (단일 인스턴스 메모리). 짧은 시간 폭주만 막는 용도.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 3;
const ipHits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX_PER_WINDOW) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) ipHits.clear(); // 메모리 누수 방지(러프)
  return false;
}

export async function POST(request: Request) {
  const ip = (request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]
    || "unknown").trim();
  if (rateLimited(ip)) {
    return Response.json({ ok: false, error: "잠시 후 다시 시도해주세요. (요청이 너무 잦아요)" }, { status: 429 });
  }

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
  if (!isValidContact(creatorContact)) {
    return Response.json({ ok: false, error: "연락처는 이메일 또는 @SNS 계정 형식으로 입력해주세요." }, { status: 400 });
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
