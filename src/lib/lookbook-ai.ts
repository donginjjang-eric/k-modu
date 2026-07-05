// 룩북 AI: 이미지 기반 한국어 캡션 생성 + 룩북 텍스트 영어 번역 (OpenAI Chat API)
import type { Designer, Lookbook, LookbookItem } from "./types";

const CHAT_URL = "https://api.openai.com/v1/chat/completions";
// 캡션은 이미지가 필요하므로 비전 지원 모델을 기본값으로 사용
const TEXT_MODEL = () => process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";

type ChatContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "low" } }>;

async function chatJson(messages: Array<{ role: "system" | "user"; content: ChatContent }>) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TEXT_MODEL(),
      messages,
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 1200,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI 응답 오류 (${response.status})`);
  }
  const text = payload?.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("AI 응답을 해석하지 못했어요.");
  }
}

function toAbsolute(url: string, baseUrl: string) {
  if (/^https?:\/\//.test(url)) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

// 시각 자산(룩·포트폴리오)에 짧은 한국어 캡션을 생성 — 상품 라벨은 건드리지 않는다
export async function generateLookbookCaptions(input: {
  items: LookbookItem[];
  designer: Pick<Designer, "brand_name" | "mood" | "description">;
  baseUrl: string;
  maxImages?: number;
}): Promise<LookbookItem[]> {
  const limit = input.maxImages ?? 20;
  const targets = input.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type !== "product")
    .slice(0, limit);
  if (!targets.length) return input.items;

  const content: ChatContent = [
    {
      type: "text",
      text: [
        `당신은 K-패션 룩북을 만드는 패션 에디터입니다. 브랜드: ${input.designer.brand_name}.`,
        `브랜드 무드: ${input.designer.mood || "미니멀 K-패션"}.`,
        `아래 ${targets.length}장의 룩 이미지 각각에 한국어 캡션을 1개씩 만들어주세요.`,
        "규칙: 캡션은 12~30자, 스타일링 포인트나 무드를 표현, 번호·따옴표·해시태그 금지.",
        `JSON으로만 응답: {"captions": ["...", ...]} — 배열 길이는 정확히 ${targets.length}.`,
      ].join("\n"),
    },
    ...targets.map(({ item }) => ({
      type: "image_url" as const,
      image_url: { url: toAbsolute(item.imageUrl, input.baseUrl), detail: "low" as const },
    })),
  ];

  const result = await chatJson([{ role: "user", content }]);
  const captions = Array.isArray(result.captions) ? result.captions : [];

  const next = input.items.map((item) => ({ ...item }));
  targets.forEach(({ index }, i) => {
    const caption = typeof captions[i] === "string" ? String(captions[i]).trim().slice(0, 80) : "";
    if (caption) next[index].label = caption;
  });
  return next;
}

// 룩북 텍스트(제목·무드 문구·인트로·캡션)를 패션 에디토리얼 톤의 영어로 번역
export async function translateLookbookContent(input: {
  lookbook: Pick<Lookbook, "title" | "tagline" | "items">;
  intro: string;
  brandName: string;
}): Promise<{ title: string; tagline: string; intro: string; labels: string[] }> {
  const labels = input.lookbook.items.map((item) => item.label || "");
  const source = {
    title: input.lookbook.title,
    tagline: input.lookbook.tagline,
    intro: input.intro,
    labels,
  };

  const result = await chatJson([
    {
      role: "system",
      content: "You are a fashion editor localizing a Korean fashion brand lookbook into natural, editorial English for global creators and buyers.",
    },
    {
      role: "user",
      content: [
        `Brand name (keep untranslated): ${input.brandName}`,
        "Translate every field of this JSON into polished editorial English.",
        "Keep the same JSON shape and the labels array length identical. Empty strings stay empty.",
        "Captions should be short (under 8 words), no quotes or numbering.",
        JSON.stringify(source),
      ].join("\n"),
    },
  ]);

  const outLabels = Array.isArray(result.labels) ? result.labels.map((v) => String(v || "").slice(0, 80)) : labels;
  while (outLabels.length < labels.length) outLabels.push("");

  return {
    title: String(result.title || input.lookbook.title).slice(0, 60),
    tagline: String(result.tagline || "").slice(0, 120),
    intro: String(result.intro || "").slice(0, 600),
    labels: outLabels.slice(0, labels.length),
  };
}
