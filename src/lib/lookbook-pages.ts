// 룩북 페이지 빌더: 사진 목록 + 레이아웃 지정을 매거진 페이지로 변환 (편집기·공개 페이지 공용)
import type { LookbookItem, LookbookLayout } from "./types";

export type MagazineItem = LookbookItem & { no?: number };

export type MagazinePageKind = "cover" | "intro" | "full" | "duo" | "hero" | "grid" | "index" | "back";

export type MagazinePage = {
  kind: MagazinePageKind;
  items: MagazineItem[];
  // 원본 items 배열에서의 위치 — 편집기의 슬롯 교체용 (공개 뷰어는 사용 안 함)
  itemIndexes: number[];
};

export const LAYOUT_COUNT: Record<LookbookLayout, number> = { full: 1, duo: 2, hero: 3, grid: 4 };
const AUTO_CYCLE: LookbookLayout[] = ["full", "duo", "hero"];

export function isLookPage(kind: MagazinePageKind) {
  return kind === "full" || kind === "duo" || kind === "hero" || kind === "grid";
}

export function buildLookbookPages(
  items: LookbookItem[],
  opts: { hasIntro: boolean; layouts?: LookbookLayout[] },
) {
  const visualIndexes: number[] = [];
  const productIndexes: number[] = [];
  items.forEach((item, index) => {
    if (item.type === "product") productIndexes.push(index);
    else visualIndexes.push(index);
  });

  // 룩 번호는 시각 자산 순서 기준
  const numberOf = new Map<number, number>();
  visualIndexes.forEach((itemIndex, order) => numberOf.set(itemIndex, order + 1));

  const mag = (itemIndex: number): MagazineItem => ({ ...items[itemIndex], no: numberOf.get(itemIndex) });

  const coverItemIndex = visualIndexes[0] ?? productIndexes[0] ?? -1;
  const coverImage = coverItemIndex >= 0 ? items[coverItemIndex].imageUrl : "";

  const pages: MagazinePage[] = [{
    kind: "cover",
    items: coverItemIndex >= 0 ? [mag(coverItemIndex)] : [],
    itemIndexes: coverItemIndex >= 0 ? [coverItemIndex] : [],
  }];
  if (opts.hasIntro) pages.push({ kind: "intro", items: [], itemIndexes: [] });

  // 커버에 쓴 첫 장은 본문에서 제외
  const rest = visualIndexes.slice(1);
  const layouts = (opts.layouts || []).filter((layout): layout is LookbookLayout => layout in LAYOUT_COUNT);
  let cursor = 0;
  let layoutIndex = 0;
  while (cursor < rest.length) {
    const wanted = layouts[layoutIndex] ?? AUTO_CYCLE[layoutIndex % AUTO_CYCLE.length];
    const count = Math.min(LAYOUT_COUNT[wanted], rest.length - cursor);
    const chunk = rest.slice(cursor, cursor + count);
    // 남은 사진이 레이아웃 정원보다 적으면 장수에 맞는 레이아웃으로 강등
    const effective: LookbookLayout = count === 1 ? "full" : count === 2 ? "duo" : count === 3 ? "hero" : wanted;
    pages.push({ kind: effective, items: chunk.map(mag), itemIndexes: chunk });
    cursor += count;
    layoutIndex += 1;
  }

  for (let i = 0; i < productIndexes.length; i += 6) {
    const chunk = productIndexes.slice(i, i + 6);
    pages.push({ kind: "index", items: chunk.map(mag), itemIndexes: chunk });
  }
  pages.push({ kind: "back", items: [], itemIndexes: [] });

  return {
    pages,
    coverImage,
    coverItemIndex,
    lookCount: visualIndexes.length || productIndexes.length,
  };
}

// 현재 페이지 구성에서 룩 페이지들의 레이아웃 시퀀스를 추출 (저장·수정용)
export function extractLookLayouts(pages: MagazinePage[]): LookbookLayout[] {
  return pages
    .filter((page) => isLookPage(page.kind))
    .map((page) => page.kind as LookbookLayout);
}
