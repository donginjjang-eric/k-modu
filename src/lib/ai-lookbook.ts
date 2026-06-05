import { createHash } from "node:crypto";
import { readPublicImageAsDataUrl, saveGeneratedPng } from "./storage";
import type { Designer, ModelTemplate, Product } from "./types";

export const promptVersion = "kmodu-lookbook-v1";

export function buildLookCacheKey(input: {
  designerId: string;
  modelTemplateId: string;
  products: Product[];
  stylingPrompt: string;
  provider: "openai";
}) {
  return createHash("sha256")
    .update(JSON.stringify({
      designerId: input.designerId,
      modelTemplateId: input.modelTemplateId,
      products: input.products.map((product) => ({
        id: product.id,
        imageHash: product.image_hash || "",
        updatedAt: product.updated_at || "",
      })).sort((a, b) => a.id.localeCompare(b.id)),
      stylingPrompt: input.stylingPrompt || "",
      promptVersion,
      provider: input.provider,
    }))
    .digest("hex")
    .slice(0, 24);
}

export function buildLookbookPrompt(input: {
  designer: Designer;
  template: ModelTemplate;
  products: Product[];
  stylingPrompt: string;
}) {
  const itemLines = input.products.map((product, index) => (
    `${index + 1}. ${product.name} (${product.category}) - ${product.mood || product.description || "designer product"}`
  )).join("\n");

  return [
    "Create one photorealistic K-MODU AI Lookbook Generation image.",
    "This is a brand lookbook image generation task, not exact size fitting.",
    `Brand: ${input.designer.brand_name}`,
    `Brand mood: ${input.designer.mood}`,
    `Model template: ${input.template.name}. ${input.template.prompt_description}`,
    "Selected products:",
    itemLines,
    `Styling prompt: ${input.stylingPrompt || "minimal editorial K-fashion full look preview"}`,
    "Use the first input image as the fixed model reference and the remaining input images as product/style references.",
    "Show one adult fashion model wearing a cohesive Full Look Preview inspired by the selected products.",
    "Vertical 4:5 composition, full body or 7/8 body centered, realistic fabric, realistic face and hands.",
    "No text, no logo, no watermark, no collage, no extra people, no product flat-lay.",
  ].join("\n");
}

export async function generateOpenAiLookbook(input: {
  designer: Designer;
  template: ModelTemplate;
  products: Product[];
  stylingPrompt: string;
  cacheKey: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const prompt = buildLookbookPrompt(input);
  const imageInputs = [
    input.template.image_url,
    ...input.products.map((product) => product.tryon_image_url || product.image_url),
  ].slice(0, 16);

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
      size: process.env.OPENAI_IMAGE_SIZE || "1024x1536",
      prompt,
      images: imageInputs.map((image) => ({ image_url: readPublicImageAsDataUrl(image) })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI image generation failed with ${response.status}: ${errorText.slice(0, 220)}`);
  }

  const result = await response.json();
  const base64Image = result.data?.[0]?.b64_json;
  const urlImage = result.data?.[0]?.url;

  if (base64Image) {
    return {
      imageUrl: saveGeneratedPng(`look-${input.cacheKey}.png`, base64Image).url,
      prompt,
    };
  }

  if (urlImage) {
    return {
      imageUrl: urlImage,
      prompt,
    };
  }

  throw new Error("OpenAI image generation completed without an image output.");
}
