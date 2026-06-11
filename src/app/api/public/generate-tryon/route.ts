import { spawn } from "node:child_process";
import path from "node:path";
import {
  countDailyLiveGenerations,
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
  const designerId = url.searchParams.get("designerId")?.trim() || "";
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
  const designerId = String(body.designerId || "").trim();
  const productIds = Array.isArray(body.productIds) ? body.productIds.map(String).filter(Boolean) : [];
  const modelTemplateId = String(body.modelTemplateId || body.modelTemplate || "");
  const stylingPrompt = String(body.stylingPrompt || "minimal editorial K-fashion look");
  const provider = "openai" as const;

  if (!designerId) {
    return Response.json({ ok: false, error: "designerId is required." }, { status: 400 });
  }
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

  const dailyLimit = Number(process.env.PUBLIC_DAILY_GENERATION_LIMIT || process.env.DAILY_GENERATION_LIMIT || 20);
  const dailyCount = await countDailyLiveGenerations(designer.id);
  if (dailyCount >= dailyLimit) {
    return Response.json({
      ok: false,
      error: `Daily generation limit reached (${dailyLimit}). Cached looks are still available.`,
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
