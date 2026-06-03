import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, stat, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8010);
const generatedLooksDir = process.env.GENERATED_LOOKS_DIR || (process.env.RAILWAY_ENVIRONMENT ? "/data/generated-looks" : path.join(root, ".runtime", "generated-looks"));
const generatedLooksPublicPath = "/generated-looks";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

const fallbackTryOnConfig = {
  defaultTemplate: "fixed-female-minimal",
  fallbackProvider: "kmodu-demo-assets",
  modelTemplates: [
    {
      id: "fixed-female-minimal",
      label: "K-Fashion Female",
      previewImage: "assets/mainmodel_2.png",
      generatedLookImage: "assets/generated-looks/maison-lune-kfashion-female-full-look.png",
    },
  ],
  messages: {
    fallbackGenerated: "Generated look preview loaded from K-MODU demo assets.",
    providerConfigured: "Provider is configured, but this MVP endpoint is still returning the saved fallback preview.",
  },
};

const loadTryOnConfig = () => {
  try {
    const configPath = path.join(root, "data", "tryon-config.json");
    return JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    return fallbackTryOnConfig;
  }
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
};

const ensureGeneratedLooksDir = () => {
  mkdirSync(generatedLooksDir, { recursive: true });
};

const readJsonBody = (req) => new Promise((resolve, reject) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) {
      reject(new Error("Request body too large"));
      req.destroy();
    }
  });
  req.on("end", () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch (error) {
      reject(new Error("Invalid JSON body"));
    }
  });
  req.on("error", reject);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeAssetPath = (assetPath = "") => assetPath.replace(/^\/+/, "");

const toImageInput = (assetPath) => {
  if (!assetPath) return "";
  if (/^https?:\/\//i.test(assetPath) || assetPath.startsWith("data:")) return assetPath;

  const normalizedPath = normalizeAssetPath(assetPath);
  const filePath = path.join(root, normalizedPath);
  if (!filePath.startsWith(root)) {
    throw new Error("Invalid image path.");
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = types[ext] || "application/octet-stream";
  const base64 = readFileSync(filePath).toString("base64");
  return `data:${mimeType};base64,${base64}`;
};

const getPublicGeneratedLookPath = (fileName) => `${generatedLooksPublicPath}/${fileName}`;

const buildGenerationCacheKey = ({ payload, template, provider }) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const cacheInput = {
    provider,
    brand: payload.brand || "",
    modelTemplate: template.id,
    brandMood: payload.brandMood || "",
    stylingPrompt: payload.stylingPrompt || "",
    items: items.map((item) => ({
      name: item.name || "",
      category: item.category || "",
      image: item.image || "",
    })).sort((a, b) => `${a.category}:${a.name}:${a.image}`.localeCompare(`${b.category}:${b.name}:${b.image}`)),
  };
  return createHash("sha256").update(JSON.stringify(cacheInput)).digest("hex").slice(0, 24);
};

const getCachedGeneratedLook = (cacheKey) => {
  const fileName = `openai-look-${cacheKey}.png`;
  const filePath = path.join(generatedLooksDir, fileName);
  if (!existsSync(filePath)) return null;
  return {
    fileName,
    generatedImage: getPublicGeneratedLookPath(fileName),
  };
};

const saveGeneratedImage = (base64Image, fileName) => {
  ensureGeneratedLooksDir();
  const safeFileName = fileName || `openai-look-${Date.now()}.png`;
  writeFileSync(path.join(generatedLooksDir, safeFileName), Buffer.from(base64Image, "base64"));
  return getPublicGeneratedLookPath(safeFileName);
};

const getTemplate = (config, templateId) => {
  const templates = Array.isArray(config.modelTemplates) ? config.modelTemplates : [];
  return templates.find((template) => template.id === templateId)
    || templates.find((template) => template.id === config.defaultTemplate)
    || templates[0]
    || fallbackTryOnConfig.modelTemplates[0];
};

const resolveFallbackTryOnImage = (config, { items = [], modelTemplate, fullLookImage }) => {
  const selectedItems = Array.isArray(items) ? items : [];
  const template = getTemplate(config, modelTemplate);
  if (selectedItems.length > 1) {
    return template.generatedLookImage;
  }
  const firstModelLook = selectedItems.find((item) => item?.modelLookImage)?.modelLookImage;
  return firstModelLook || template.generatedLookImage || fullLookImage || "assets/styling-board-maison-lune-01.png";
};

const waitForFashnPrediction = async (predictionId, apiKey) => {
  const timeoutMs = Number(process.env.FASHN_POLL_TIMEOUT_MS || 90_000);
  const pollIntervalMs = Number(process.env.FASHN_POLL_INTERVAL_MS || 2_500);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const statusResponse = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!statusResponse.ok) {
      throw new Error(`FASHN status failed with ${statusResponse.status}`);
    }

    const statusResult = await statusResponse.json();
    if (statusResult.status === "completed") {
      const output = Array.isArray(statusResult.output) ? statusResult.output[0] : statusResult.output;
      if (!output) throw new Error("FASHN completed without an output image.");
      return output;
    }

    if (["failed", "canceled"].includes(statusResult.status)) {
      throw new Error(statusResult.error || `FASHN prediction ${statusResult.status}`);
    }

    await sleep(pollIntervalMs);
  }

  throw new Error("FASHN prediction timed out.");
};

const generateFashnTryOn = async ({ payload, template }) => {
  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    throw new Error("FASHN_API_KEY is not configured.");
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const garment = items.find((item) => item?.image) || items[0];
  if (!garment?.image) {
    throw new Error("A product image is required for FASHN try-on.");
  }

  const modelImage = toImageInput(payload.baseModelImage || template.previewImage);
  const garmentImage = toImageInput(garment.image);
  const runResponse = await fetch("https://api.fashn.ai/v1/run", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: "tryon-max",
      inputs: {
        model_image: modelImage,
        garment_image: garmentImage,
        category: "auto",
        mode: "balanced",
      },
    }),
  });

  if (!runResponse.ok) {
    const errorText = await runResponse.text();
    throw new Error(`FASHN run failed with ${runResponse.status}: ${errorText.slice(0, 220)}`);
  }

  const runResult = await runResponse.json();
  const predictionId = runResult.id || runResult.prediction_id;
  if (!predictionId) {
    throw new Error("FASHN run did not return a prediction id.");
  }

  return {
    id: predictionId,
    generatedImage: await waitForFashnPrediction(predictionId, apiKey),
  };
};

const buildOpenAiLookbookPrompt = ({ payload, template }) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const itemLines = items.map((item, index) => (
    `${index + 1}. ${item.name || "Unnamed product"} (${item.category || "item"})`
  )).join("\n");
  const brand = payload.brand || "K-MODU designer brand";
  const brandMood = payload.brandMood || "Seoul K-fashion, premium but approachable, warm editorial lookbook";
  const stylingPrompt = payload.stylingPrompt || "Create a realistic full-body brand lookbook image that makes the selected designer products look worn by the fixed model.";

  return [
    "Create one photorealistic fashion lookbook image for K-MODU.",
    "This is not a precision virtual fitting task. Prioritize a believable brand Full Look campaign image.",
    `Brand: ${brand}`,
    `Model template: ${template.label || template.id}`,
    `Brand mood: ${brandMood}`,
    "Selected products:",
    itemLines || "- Selected designer products",
    `Styling direction: ${stylingPrompt}`,
    "Use the first input image as the fixed model reference and the remaining input images as product/style references.",
    "Preserve the overall identity of the model template, but adapt hair, pose, and styling naturally for a fashion editorial.",
    "Show one adult fashion model wearing a cohesive look inspired by the selected products.",
    "Vertical 4:5 composition, full body or 7/8 body centered, clean studio/editorial background, realistic fabric, realistic hands and face.",
    "No text, no logo, no watermark, no collage, no extra people, no product flat-lay."
  ].join("\n");
};

const generateOpenAiLookbook = async ({ payload, template }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const inputImages = [
    payload.baseModelImage || template.previewImage,
    ...items.map((item) => item.image).filter(Boolean),
  ].slice(0, 16);

  if (!inputImages.length) {
    throw new Error("At least one model or product image is required for OpenAI image generation.");
  }

  const prompt = buildOpenAiLookbookPrompt({ payload, template });
  const cacheKey = buildGenerationCacheKey({ payload, template, provider: "openai" });
  const cachedLook = getCachedGeneratedLook(cacheKey);
  if (cachedLook) {
    return {
      id: `cache-${cacheKey}`,
      generatedImage: cachedLook.generatedImage,
      cacheHit: true,
      promptMetadata: {
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        size: process.env.OPENAI_IMAGE_SIZE || "1024x1536",
        prompt,
        inputImages,
        cacheKey,
      },
    };
  }

  const imagePayload = {
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    prompt,
    images: inputImages.map((image) => ({ image_url: toImageInput(image) })),
    size: process.env.OPENAI_IMAGE_SIZE || "1024x1536",
  };

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(imagePayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI image generation failed with ${response.status}: ${errorText.slice(0, 220)}`);
  }

  const result = await response.json();
  const output = result.data?.[0];
  const base64Image = output?.b64_json;
  const urlImage = output?.url;
  if (base64Image) {
    return {
      id: result.id || `openai-${Date.now()}`,
      generatedImage: saveGeneratedImage(base64Image, `openai-look-${cacheKey}.png`),
      cacheHit: false,
      promptMetadata: {
        model: imagePayload.model,
        size: imagePayload.size,
        prompt,
        inputImages,
        cacheKey,
      },
    };
  }

  if (urlImage) {
    return {
      id: result.id || `openai-${Date.now()}`,
      generatedImage: urlImage,
      cacheHit: false,
      promptMetadata: {
        model: imagePayload.model,
        size: imagePayload.size,
        prompt,
        inputImages,
        cacheKey,
      },
    };
  }

  throw new Error("OpenAI image generation completed without an image output.");
};

createServer(async (req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  if (urlPath.startsWith(`${generatedLooksPublicPath}/`)) {
    const fileName = path.basename(urlPath);
    const filePath = path.join(generatedLooksDir, fileName);
    if (!filePath.startsWith(generatedLooksDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    stat(filePath, (error, stats) => {
      if (error || !stats.isFile()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      createReadStream(filePath).pipe(res);
    });
    return;
  }

  if (urlPath === "/api/generate-tryon") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    try {
      const payload = await readJsonBody(req);
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) {
        sendJson(res, 400, { error: "At least one styling item is required." });
        return;
      }

      const config = loadTryOnConfig();
      const template = getTemplate(config, payload.modelTemplate);
      const provider = process.env.VIRTUAL_TRYON_PROVIDER || "fallback";
      const fallbackImage = resolveFallbackTryOnImage(config, payload);
      let generation = {
        id: `tryon-${Date.now()}`,
        generatedImage: fallbackImage,
        mode: "fallback",
        message: provider === "fallback"
          ? config.messages?.fallbackGenerated || fallbackTryOnConfig.messages.fallbackGenerated
          : config.messages?.providerConfigured || fallbackTryOnConfig.messages.providerConfigured,
      };

      if (provider === "fashn") {
        try {
          const fashnResult = await generateFashnTryOn({ payload, template });
          generation = {
            id: fashnResult.id,
            generatedImage: fashnResult.generatedImage,
            mode: "live",
            message: "Live FASHN virtual try-on generated.",
          };
        } catch (error) {
          generation = {
            ...generation,
            mode: "fallback",
            message: `FASHN generation failed, showing demo fallback. ${error.message}`,
          };
        }
      }

      if (provider === "openai") {
        try {
          const openAiResult = await generateOpenAiLookbook({ payload, template });
          generation = {
            id: openAiResult.id,
            generatedImage: openAiResult.generatedImage,
            mode: "live",
            cacheHit: Boolean(openAiResult.cacheHit),
            message: openAiResult.cacheHit ? "Cached OpenAI lookbook image reused." : "Live OpenAI lookbook image generated.",
            promptMetadata: openAiResult.promptMetadata,
          };
        } catch (error) {
          generation = {
            ...generation,
            mode: "fallback",
            message: `OpenAI lookbook generation failed, showing demo fallback. ${error.message}`,
          };
        }
      }

      sendJson(res, 200, {
        id: generation.id,
        provider,
        mode: generation.mode,
        modelTemplate: template.id,
        generatedImage: generation.generatedImage,
        cacheHit: Boolean(generation.cacheHit),
        promptMetadata: generation.promptMetadata || null,
        items,
        message: generation.message
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to generate try-on preview." });
    }
    return;
  }

  if (urlPath === "/api/public/styling-board") {
    // Local mirror of the Next public endpoint (no DB locally) — returns the
    // same demo designer + cutout products so legacy:start testing works.
    const designerId = (req.url || "").split("?")[1]?.match(/designerId=([^&]+)/)?.[1];
    const wanted = designerId ? decodeURIComponent(designerId) : "";
    if (wanted && wanted !== "maison-lune-seoul") {
      sendJson(res, 404, { ok: false, error: "Designer not found." });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      designer: { id: "maison-lune-seoul", brandName: "Maison Lune Seoul", mood: "Seoul K-fashion, minimal black tailoring" },
      products: [
        { id: "top-ivory-lace-bow", name: "Ivory Lace Bow Top", category: "Top", image: "/assets/designer-samples/product-top-ivory-lace-bow.png", status: "보유" },
        { id: "skirt-brown-polka-bubble", name: "Brown Polka Bubble Skirt", category: "Bottom", image: "/assets/designer-samples/product-skirt-brown-polka-bubble.png", status: "보유" },
        { id: "bag-black-glossy-shoulder", name: "Black Glossy Shoulder Bag", category: "Bag", image: "/assets/designer-samples/product-bag-black-glossy-shoulder.png", status: "보유" },
        { id: "shoes-black-cork-wedge-sandals", name: "Cork Wedge Sandals", category: "Shoes", image: "/assets/designer-samples/product-shoes-black-cork-wedge-sandals.png", status: "보유" },
      ],
    });
    return;
  }

  if (urlPath === "/api/tryon-config") {
    const config = loadTryOnConfig();
    sendJson(res, 200, {
      defaultTemplate: config.defaultTemplate || fallbackTryOnConfig.defaultTemplate,
      provider: process.env.VIRTUAL_TRYON_PROVIDER || "fallback",
      modelTemplates: (config.modelTemplates || []).map((template) => ({
        id: template.id,
        label: template.label,
        previewImage: template.previewImage,
        generatedLookImage: template.generatedLookImage,
      })),
    });
    return;
  }

  const filePath = path.join(root, urlPath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(res);
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`K-MODU local server: http://localhost:${port}`);
});
