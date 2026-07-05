// 룩북 항목 입력 검증: API 경계에서 이미지 URL·타입을 정제해 저장 (XSS·임의 URL 차단)
import type { LookbookItem, LookbookLayout } from "./types";

export const MAX_LOOKBOOK_ITEMS = 40;

const SAFE_URL = /^(\/|https?:\/\/)/;

export function sanitizeLookbookItems(raw: unknown): LookbookItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_LOOKBOOK_ITEMS) return null;

  const items: LookbookItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const candidate = entry as Record<string, unknown>;
    const type = candidate.type === "look" || candidate.type === "portfolio" || candidate.type === "product"
      ? candidate.type
      : null;
    const refId = typeof candidate.refId === "string" ? candidate.refId.slice(0, 100) : "";
    const imageUrl = typeof candidate.imageUrl === "string" ? candidate.imageUrl.trim() : "";
    if (!type || !imageUrl || !SAFE_URL.test(imageUrl)) return null;
    const videoUrl = typeof candidate.videoUrl === "string" && SAFE_URL.test(candidate.videoUrl.trim())
      ? candidate.videoUrl.trim()
      : null;
    const label = typeof candidate.label === "string" ? candidate.label.trim().slice(0, 80) : "";
    items.push({ type, refId, imageUrl, videoUrl, label });
  }
  return items;
}

// 페이지 레이아웃 시퀀스 검증 — 허용된 값만, 최대 60페이지
export function sanitizeLookbookLayouts(raw: unknown): LookbookLayout[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((value): value is LookbookLayout => value === "full" || value === "duo" || value === "hero" || value === "grid")
    .slice(0, 60);
}
