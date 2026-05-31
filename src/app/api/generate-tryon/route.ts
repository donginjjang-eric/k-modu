import { requireApprovedDesigner } from "@/lib/auth";
import {
  countDailyLiveGenerations,
  createGeneratedLook,
  createGenerationLog,
  getGeneratedLookByCacheKey,
  getModelTemplate,
  getOwnedProductsForGeneration,
} from "@/lib/db";
import { buildLookCacheKey, buildLookbookPrompt, generateOpenAiLookbook } from "@/lib/ai-lookbook";

export async function POST(request: Request) {
  const { user, designer } = await requireApprovedDesigner();
  const body = await request.json().catch(() => ({}));
  const productIds = Array.isArray(body.productIds) ? body.productIds.map(String) : [];
  const modelTemplateId = String(body.modelTemplateId || body.modelTemplate || "");
  const stylingPrompt = String(body.stylingPrompt || "minimal editorial K-fashion look");
  const forceRegenerate = Boolean(body.forceRegenerate);
  const provider = "openai" as const;

  if (productIds.length < 2) {
    return Response.json({ ok: false, error: "Select at least two products." }, { status: 400 });
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

  try {
    const generated = await generateOpenAiLookbook({
      designer,
      template,
      products,
      stylingPrompt,
      cacheKey,
    });
    const generatedLook = await createGeneratedLook({
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

    return Response.json({
      ok: true,
      provider,
      cacheHit: false,
      imageUrl: generated.imageUrl,
      generatedLookId: generatedLook?.id,
      selectedItems: products,
      promptMetadata: {
        cacheKey,
        promptVersion: "kmodu-lookbook-v1",
        prompt: generated.prompt,
      },
    });
  } catch (error) {
    await createGenerationLog({
      userId: user.id,
      designerId: designer.id,
      provider,
      cacheKey,
      cacheHit: false,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown generation error",
    });
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to generate AI look.",
    }, { status: 500 });
  }
}
