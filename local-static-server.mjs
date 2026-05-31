import { createReadStream, readFileSync, stat } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8010);
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

createServer(async (req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

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

      sendJson(res, 200, {
        id: generation.id,
        provider,
        mode: generation.mode,
        modelTemplate: template.id,
        generatedImage: generation.generatedImage,
        items,
        message: generation.message
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to generate try-on preview." });
    }
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
