export const STYLING_PRODUCT_CATEGORY_LIMITS = {
  "상의": 1,
  "하의": 1,
  "악세서리": 2,
} as const;

export type StylingProductCategory = keyof typeof STYLING_PRODUCT_CATEGORY_LIMITS;

export function groupStylingProductCategory(category: string): StylingProductCategory {
  const raw = String(category || "").trim();
  const value = raw.toLowerCase();

  if (raw.includes("하의") || ["bottom", "bottoms", "pants", "trouser", "trousers", "skirt"].includes(value)) {
    return "하의";
  }
  if (
    raw.includes("상의")
    || raw.includes("아우터")
    || ["top", "tops", "inner", "shirt", "outer", "outerwear", "jacket", "coat"].includes(value)
  ) {
    return "상의";
  }
  return "악세서리";
}

export function validateStylingProductSelection(products: Array<{ category: string }>) {
  const counts: Record<StylingProductCategory, number> = {
    "상의": 0,
    "하의": 0,
    "악세서리": 0,
  };

  for (const product of products) {
    counts[groupStylingProductCategory(product.category)] += 1;
  }

  for (const [category, limit] of Object.entries(STYLING_PRODUCT_CATEGORY_LIMITS) as Array<[StylingProductCategory, number]>) {
    if (counts[category] > limit) {
      return {
        ok: false,
        error: `${category}는 최대 ${limit}개까지 선택할 수 있습니다. 상의 1개, 하의 1개, 악세서리 2개 조합으로 선택해주세요.`,
      };
    }
  }

  return { ok: true, error: "" };
}
