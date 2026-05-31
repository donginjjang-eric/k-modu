import { createReadStream, stat } from "node:fs";
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

const generatedLookImages = {
  "fixed-female-minimal": "assets/generated-looks/maison-lune-kfashion-female-full-look.png",
  "fixed-street": "assets/generated-looks/maison-lune-street-full-look.png",
  "fixed-male": "assets/generated-looks/maison-lune-male-full-look.png",
};

const resolveFallbackTryOnImage = ({ items = [], modelTemplate, fullLookImage }) => {
  const selectedItems = Array.isArray(items) ? items : [];
  if (selectedItems.length > 1) {
    return generatedLookImages[modelTemplate] || generatedLookImages["fixed-female-minimal"];
  }
  const firstModelLook = selectedItems.find((item) => item?.modelLookImage)?.modelLookImage;
  return firstModelLook || generatedLookImages[modelTemplate] || fullLookImage || "assets/styling-board-maison-lune-01.png";
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

      const generatedImage = resolveFallbackTryOnImage(payload);
      const provider = process.env.VIRTUAL_TRYON_PROVIDER || "fallback";
      sendJson(res, 200, {
        id: `tryon-${Date.now()}`,
        provider,
        mode: "fallback",
        modelTemplate: payload.modelTemplate || "fixed-female-minimal",
        generatedImage,
        items,
        message: provider === "fallback"
          ? "Generated look preview loaded from K-MODU demo assets. Add a Virtual Try-On API key on Railway to replace this with live AI output."
          : "Provider is configured, but this MVP endpoint is still returning the saved fallback preview."
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to generate try-on preview." });
    }
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
