// 공개: 브랜드가 운영팀에 큐레이션 크리에이터 협업 제안을 접수하는 API
import { getCurrentUser } from "@/lib/auth";
import { createCreatorCollabProposal } from "@/lib/db";
import type { CreatorProposalType } from "@/lib/types";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidContact(contact: string) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return true;
  if (/@[\w.]{2,}/.test(contact)) return true;
  if ((contact.match(/\d/g) || []).length >= 7) return true;
  return false;
}

const VALID_TYPES = new Set<CreatorProposalType>([
  "product_seeding",
  "styling_content",
  "campaign",
  "long_term",
]);

// 짧은 시간의 자동 제출 폭주를 차단한다. 영구적인 남용 방지는 인프라 rate limit과 함께 사용한다.
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX_PER_WINDOW = 5;
const ipHits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX_PER_WINDOW) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) ipHits.clear();
  return false;
}

export async function POST(request: Request) {
  const ip = (request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]
    || "unknown").trim();

  if (rateLimited(ip)) {
    return Response.json({ ok: false, error: "요청이 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  // 화면에는 보이지 않는 필드. 자동 입력 봇이면 성공처럼 응답하되 저장하지 않는다.
  if (cleanText(payload.website, 200)) {
    return Response.json({ ok: true, id: "received" });
  }

  const creatorKey = cleanText(payload.creatorKey, 120);
  const creatorName = cleanText(payload.creatorName, 100);
  const creatorPlatform = cleanText(payload.creatorPlatform, 40);
  const creatorMarket = cleanText(payload.creatorMarket, 40);
  const brandName = cleanText(payload.brandName, 100);
  const requesterName = cleanText(payload.requesterName, 80);
  const requesterContact = cleanText(payload.requesterContact, 140);
  const proposalType = cleanText(payload.proposalType, 40) as CreatorProposalType;
  const budget = cleanText(payload.budget, 80);
  const message = cleanText(payload.message, 1600);

  if (!creatorKey || !creatorName || !brandName || !requesterName || !requesterContact || !VALID_TYPES.has(proposalType)) {
    return Response.json({ ok: false, error: "필수 항목을 모두 입력해주세요." }, { status: 400 });
  }
  if (!isValidContact(requesterContact)) {
    return Response.json({ ok: false, error: "이메일, 전화번호 또는 @SNS 계정을 정확히 입력해주세요." }, { status: 400 });
  }
  if (message.length < 20) {
    return Response.json({ ok: false, error: "협업 내용을 20자 이상 적어주세요." }, { status: 400 });
  }

  const user = await getCurrentUser().catch(() => null);
  const created = await createCreatorCollabProposal({
    requester_user_id: user?.id ?? null,
    creator_key: creatorKey,
    creator_name: creatorName,
    creator_platform: creatorPlatform,
    creator_market: creatorMarket,
    brand_name: brandName,
    requester_name: requesterName,
    requester_contact: requesterContact,
    proposal_type: proposalType,
    budget,
    message,
  });

  if (!created) {
    return Response.json({ ok: false, error: "접수에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  return Response.json({ ok: true, id: created.id, status: created.status });
}
