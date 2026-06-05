import { getCurrentUser } from "@/lib/auth";
import {
  countDailyLiveGenerations,
  createGeneratedLook,
  createGenerationLog,
  getGeneratedLookByCacheKey,
  getGeneratedLookByCacheKeyForDesigner,
  getDesignerForUser,
  getLatestGenerationLogForDesigner,
  getModelTemplate,
  getOwnedProductsForGeneration,
} from "@/lib/db";
import { buildLookCacheKey, buildLookbookPrompt, generateOpenAiLookbook } from "@/lib/ai-lookbook";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "designer") {
    return Response.json({ ok: false, error: "Login as a designer before checking AI generation." }, { status: 401 });
  }

  const designer = await getDesignerForUser(user.id);
  if (!designer || designer.approval_status !== "approved") {
    return Response.json({ ok: false, error: "Designer account approval is required." }, { status: 403 });
  }

  const cacheKey = new URL(request.url).searchParams.get("cacheKey")?.trim() || "";
  if (!cacheKey) {
    return Response.json({ ok: false, error: "cacheKey is required." }, { status: 400 });
  }

  const generatedLook = await getGeneratedLookByCacheKeyForDesigner(designer.id, cacheKey);
  if (generatedLook) {
    return Response.json({
      ok: true,
      status: "completed",
      provider: generatedLook.provider,
      cacheHit: generatedLook.cache_hit,
      imageUrl: generatedLook.image_url,
      generatedLookId: generatedLook.id,
    });
  }

  const latestLog = await getLatestGenerationLogForDesigner(designer.id, cacheKey);
  if (latestLog?.status === "failed") {
    return Response.json({ ok: false, status: "failed", error: latestLog.error_message || "AI generation failed." }, { status: 500 });
  }

  return Response.json({ ok: true, status: "processing" });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "designer") {
    return Response.json({ ok: false, error: "Login as a designer before generating AI looks." }, { status: 401 });
  }

  const designer = await getDesignerForUser(user.id);
  if (!designer || designer.approval_status !== "approved") {
    return Response.json({ ok: false, error: "Designer account approval is required." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const productIds = Array.isArray(body.productIds) ? body.productIds.map(String) : [];
  const modelTemplateId = String(body.modelTemplateId || body.modelTemplate || "");
  const stylingPrompt = String(body.stylingPrompt || "minimal editorial K-fashion look");
  const forceRegenerate = Boolean(body.forceRegenerate);
  const provider = "openai" as const;

  if (productIds.length < 2) {
    return Response.json({ ok: false, error: "Select at least two products." }, { status: 400 });
  }
  if (productIds.length > 2) {
    return Response.json({
      ok: false,
      error: "Real-time AI generation currently supports up to two products. Select two products and try again.",
    }, { status: 400 });
  }
  if (new Set(productIds).size !== productIds.length) {
    return Response.json({ ok: false, error: "Duplicate products are not allowed." }, { status: 400 });
  }

  const [products, template] = await Promise.all([
    getOwnedProductsForGeneration(designer.id, productIds),
    getModelTemplate(modelTemplateId),
  ]);

  if (products.length !== new Set(productIds).size) {
    return Response.json({ ok: false, error: "One or more products do not belong to this designer." }, { status: 403 });
  }
  if (!template) {
    return Response.json({ ok: false, error: "Model template not found." }, { status: 404 });
  }

  const cacheKey = buildLookCacheKey({
    designerId: designer.id,
    modelTemplateId: template.id,
    products,
    stylingPrompt,
    provider,
  });
  const prompt = buildLookbookPrompt({ designer, template, products, stylingPrompt });

  if (!forceRegenerate) {
    const cached = await getGeneratedLookByCacheKey(cacheKey);
    if (cached) {
      await createGenerationLog({
        userId: user.id,
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
          promptVersion: "kmodu-lookbook-v1",
          prompt,
        },
      });
    }
  }

  const dailyLimit = Number(process.env.DAILY_GENERATION_LIMIT || 20);
  const dailyCount = await countDailyLiveGenerations(designer.id);
  if (dailyCount >= dailyLimit) {
    return Response.json({
      ok: false,
      error: `Daily generation limit reached (${dailyLimit}). Cached looks are still available.`,
    }, { status: 429 });
  }

  await createGenerationLog({
    userId: user.id,
    designerId: designer.id,
    provider,
    cacheKey,
    cacheHit: false,
    status: "processing",
  });

  generateOpenAiLookbook({
    designer,
    template,
    products,
    stylingPrompt,
    cacheKey,
  }).then(async (generated) => {
    await createGeneratedLook({
      designerId: designer.id,
      modelTemplateId: template.id,
      selectedProductIds: products.map((product) => product.id),
      cacheKey,
      prompt: generated.prompt,
      imageUrl: generated.imageUrl,
      cacheHit: false,
    });
    await createGenerationLog({
      userId: user.id,
      designerId: designer.id,
      provider,
      cacheKey,
      cacheHit: false,
      status: "generated",
    });
  }).catch(async (error) => {
    await createGenerationLog({
      userId: user.id,
      designerId: designer.id,
      provider,
      cacheKey,
      cacheHit: false,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown generation error",
    });
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
      promptVersion: "kmodu-lookbook-v1",
      prompt,
    },
  }, { status: 202 });
}
