// 뷰티 브랜드 간편 가입 입력을 검증하고 기존 브랜드 작업공간에 연결합니다.
import type { DatabaseTransactionClient } from "./db";

const categories = new Set(["스킨케어", "메이크업", "헤어·바디", "기타 뷰티"]);

export type BeautySignupInput = {
  brandName: string;
  managerName: string;
  category: string;
  contactEmail: string;
  channelUrl: string;
  consent: boolean;
};

export function validateBeautySignupInput(value: unknown):
  | { ok: true; value: BeautySignupInput }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "가입 정보를 확인해 주세요." };
  const input = value as Record<string, unknown>;
  const brandName = typeof input.brandName === "string" ? input.brandName.trim() : "";
  const managerName = typeof input.managerName === "string" ? input.managerName.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const contactEmail = typeof input.contactEmail === "string" ? input.contactEmail.trim().toLowerCase() : "";
  const channelUrl = typeof input.channelUrl === "string" ? input.channelUrl.trim() : "";
  if (brandName.length < 2 || brandName.length > 120) return { ok: false, error: "브랜드명은 2~120자로 입력해 주세요." };
  if (!managerName || managerName.length > 120) return { ok: false, error: "담당자명을 입력해 주세요." };
  if (!categories.has(category)) return { ok: false, error: "주요 상품 분야를 선택해 주세요." };
  if (contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { ok: false, error: "연락받을 이메일을 확인해 주세요." };
  if (channelUrl) {
    try {
      const url = new URL(channelUrl);
      if (url.protocol !== "https:" || !url.hostname.includes(".")) return { ok: false, error: "브랜드 주소는 https://로 시작하는 주소를 입력해 주세요." };
    } catch {
      return { ok: false, error: "브랜드 주소를 확인해 주세요." };
    }
  }
  if (input.consent !== true) return { ok: false, error: "브랜드 상품 등록 권한을 확인해 주세요." };
  return { ok: true, value: { brandName, managerName, category, contactEmail, channelUrl, consent: true } };
}

export async function createBeautySignup(client: DatabaseTransactionClient, userId: string, input: BeautySignupInput) {
  // 사용자 행을 잠가 같은 계정의 동시 중복 가입을 막습니다.
  await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
  const duplicate = await client.query<{ id: string; approval_status: string }>(
    `SELECT id, approval_status FROM designers
      WHERE user_id = $1 AND lower(trim(brand_name)) = lower($2)
        AND lower(trim(brand_category)) IN ('k-뷰티', '뷰티', 'k-beauty', 'beauty', '복합')
      LIMIT 1`,
    [userId, input.brandName],
  );
  if (duplicate.rows[0]) return { duplicate: true as const, designerId: duplicate.rows[0].id, membershipId: null };
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO designers
      (user_id, brand_name, designer_name, contact_email, contact_phone, description, brand_category, mood, country,
       approval_status, primary_product_category, brand_channel_url)
     VALUES ($1, $2, $3, $4, '', '', 'K-뷰티', '', 'South Korea', 'approved', $5, $6)
     RETURNING id`,
    [userId, input.brandName, input.managerName, input.contactEmail, input.category, input.channelUrl || null],
  );
  const designerId = inserted.rows[0]?.id;
  if (!designerId) throw new Error("뷰티 브랜드를 생성하지 못했습니다.");
  const membership = await client.query<{ id: string }>(
    `INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
     VALUES ($1, 'beauty_partner', $2, 'active', false) RETURNING id`,
    [userId, designerId],
  );
  const membershipId = membership.rows[0]?.id;
  if (!membershipId) throw new Error("뷰티 브랜드 작업공간을 생성하지 못했습니다.");
  await client.query(
    `INSERT INTO creator_management_audit_logs (actor_user_id, action, metadata)
     VALUES ($1, 'beauty_self_signup', $2::jsonb)`,
    [userId, JSON.stringify({ designerId, category: input.category })],
  );
  return { duplicate: false as const, designerId, membershipId };
}
