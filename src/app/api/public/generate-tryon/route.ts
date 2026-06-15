import { spawn } from "node:child_process";
import path from "node:path";
import {
  countDailyLiveGenerations,
  countDailyLiveGenerationsAll,
  createGenerationLog,
  getDesigner,
  getGeneratedLookByCacheKeyForDesigner,
  getLatestGenerationLogForDesigner,
  getModelTemplate,
  getPublicProductsForGeneration,
} from "@/lib/db";
import { buildLookCacheKey, buildLookbookPrompt, promptVersion } from "@/lib/ai-lookbook";
import { applyDesignerDefaultModelTemplate } from "@/lib/designer-defaults";
import { validateStylingProductSelection } from "@/lib/product-selection-rules";

// 공개 데모 기본 디자이너 — 실계정 KLARA STUDIO로 이전(데모 maison-lune-seoul 폐기). env로 덮어쓰기 가능.
const DEFAULT_PUBLIC_DESIGNER_ID = process.env.PUBLIC_DEFAULT_DESIGNER_ID || "fe54a0f0-60f9-4635-98aa-883f0c3a638a";
// 공개 생성은 프롬프트를 고정해 캐시 우회(비용 폭탄)를 막는다. 같은 제품 조합이면 항상 캐시 히트.
const PUBLIC_STYLING_PROMPT = "minimal editorial K-fashion look";

function startGenerationWorker(input: unknown) {
  const payload = Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
  const workerPath = path.join(process.cwd(), "scripts", "ai-generate-worker.mjs");
  const child = spawn(process.execPath, [workerPath, payload], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const designerId = url.searchParams.get("designerId")?.trim() || DEFAULT_PUBLIC_DESIGNER_ID;
  const cacheKey = url.searchParams.get("cacheKey")?.trim() || "";

  if (!designerId || !cacheKey) {
    return Response.json({ ok: false, error: "designerId and cacheKey are required." }, { status: 400 });
  }

  const generatedLook = await getGeneratedLookByCacheKeyForDesigner(designerId, cacheKey);
  if (generatedLook && generatedLook.designer_id === designerId) {
    return Response.json({
      ok: true,
      status: "completed",
      provider: generatedLook.provider,
      cacheHit: generatedLook.cache_hit,
      imageUrl: generatedLook.image_url,
      generatedLookId: generatedLook.id,
    });
  }

  const latestLog = await getLatestGenerationLogForDesigner(designerId, cacheKey);
  if (latestLog?.status === "failed") {
    return Response.json({ ok: false, status: "failed", error: latestLog.error_message || "AI generation failed." }, { status: 500 });
  }

  return Response.json({ ok: true, status: "processing" });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const designerId = String(body.designerId || DEFAULT_PUBLIC_DESIGNER_ID).trim();
  const productIds = Array.isArray(body.productIds) ? body.productIds.map(String).filter(Boolean) : [];
  const modelTemplateId = String(body.modelTemplateId || body.modelTemplate || "");
  // 공개 경로는 클라이언트 프롬프트를 무시하고 고정값 사용 (캐시 우회 차단)
  const stylingPrompt = PUBLIC_STYLING_PROMPT;
  const provider = "openai" as const;

  if (productIds.length < 1) {
    return Response.json({ ok: false, error: "Select at least one product." }, { status: 400 });
  }
  if (productIds.length > 4) {
    return Response.json({ ok: false, error: "Real-time AI generation supports up to four products." }, { status: 400 });
  }
  if (new Set(productIds).size !== productIds.length) {
    return Response.json({ ok: false, error: "Duplicate products are not allowed." }, { status: 400 });
  }

  const designer = await getDesigner(designerId);
  if (!designer || designer.approval_status !== "approved") {
    return Response.json({ ok: false, error: "Approved designer is required for public AI generation." }, { status: 403 });
  }

  const [products, template] = await Promise.all([
    getPublicProductsForGeneration(designer.id, productIds),
    getModelTemplate(modelTemplateId),
  ]);

  if (products.length !== new Set(productIds).size) {
    return Response.json({ ok: false, error: "One or more products are unavailable." }, { status: 403 });
  }
  const selectionValidation = validateStylingProductSelection(products);
  if (!selectionValidation.ok) {
    return Response.json({ ok: false, error: selectionValidation.error }, { status: 400 });
  }
  if (!template) {
    return Response.json({ ok: false, error: "Model template not found." }, { status: 404 });
  }
  const generationTemplate = applyDesignerDefaultModelTemplate(template, designer);

  const cacheKey = buildLookCacheKey({
    designerId: designer.id,
    modelTemplateId: generationTemplate.id,
    products,
    stylingPrompt,
    provider,
  });
  const prompt = buildLookbookPrompt({ designer, template: generationTemplate, products, stylingPrompt });

  const cached = await getGeneratedLookByCacheKeyForDesigner(designer.id, cacheKey);
  if (cached && cached.designer_id === designer.id) {
    await createGenerationLog({
      userId: null,
      designerId: designer.id,
      provider,
      cacheKey,
      cacheHit: true,
      status: "cached",
    });
    return Response.json({
      ok: true,
      provider,
      cacheHit: true,
      imageUrl: cached.image_url,
      generatedLookId: cached.id,
      selectedItems: products,
      promptMetadata: {
        cacheKey,
        promptVersion,
        prompt,
      },
    });
  }

  // 1) 디자이너별 일일 한도 — 관리자가 디자이너별로 조정 (DB 값 우선, 없으면 env/기본)
  const envDefault = Number(process.env.PUBLIC_DAILY_GENERATION_LIMIT || process.env.DAILY_GENERATION_LIMIT || 20);
  const dailyLimit = Number.isFinite(designer.daily_generation_limit) ? designer.daily_generation_limit : envDefault;
  const dailyCount = await countDailyLiveGenerations(designer.id);
  if (dailyCount >= dailyLimit) {
    return Response.json({
      ok: false,
      error: `오늘 이 브랜드의 AI 생성 한도(${dailyLimit}건)에 도달했어요. 이미 만든 룩은 계속 볼 수 있어요.`,
    }, { status: 429 });
  }

  // 2) 전역 일일 상한 — 전체 비용 안전망 (악용·폭주 대비)
  const globalLimit = Number(process.env.GLOBAL_DAILY_GENERATION_LIMIT || 200);
  const globalCount = await countDailyLiveGenerationsAll();
  if (globalCount >= globalLimit) {
    return Response.json({
      ok: false,
      error: "현재 AI 생성 요청이 많아요. 잠시 후 다시 시도해주세요.",
    }, { status: 429 });
  }

  await createGenerationLog({
    userId: null,
    designerId: designer.id,
    provider,
    cacheKey,
    cacheHit: false,
    status: "processing",
  });

  startGenerationWorker({
    userId: null,
    designer,
    template: generationTemplate,
    products,
    stylingPrompt,
    cacheKey,
  });

  return Response.json({
    ok: true,
    provider,
    status: "processing",
    cacheHit: false,
    cacheKey,
    selectedItems: products,
    promptMetadata: {
      cacheKey,
      promptVersion,
      prompt,
    },
  }, { status: 202 });
}
