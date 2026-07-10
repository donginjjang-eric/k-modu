import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = process.argv.slice(2);
const files = targets.length
  ? targets
  : (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
      .map((entry) => entry.name);
const metadataCache = new Map();

function localAssetFromTag(tag) {
  const source = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  if (!source || source.includes("${") || /^(?:data:|https?:|\/\/)/i.test(source)) return null;
  const clean = source.split(/[?#]/, 1)[0].replace(/^\//, "");
  if (!clean.startsWith("assets/")) return null;
  return clean;
}

async function dimensions(assetPath) {
  if (!metadataCache.has(assetPath)) {
    metadataCache.set(assetPath, sharp(path.join(root, assetPath)).metadata());
  }
  const meta = await metadataCache.get(assetPath);
  if (!meta.width || !meta.height) return null;
  return { width: Math.round(meta.width), height: Math.round(meta.height) };
}

async function enrichHtml(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  const input = await readFile(absolutePath, "utf8");
  const tags = [...input.matchAll(/<img\b[^>]*>/gi)];
  let output = input;
  let changed = 0;

  for (const match of tags.reverse()) {
    const tag = match[0];
    if (/\bwidth=["']/i.test(tag) && /\bheight=["']/i.test(tag)) continue;
    const assetPath = localAssetFromTag(tag);
    if (!assetPath) continue;

    try {
      const size = await dimensions(assetPath);
      if (!size) continue;
      const missingWidth = !/\bwidth=["']/i.test(tag) ? ` width="${size.width}"` : "";
      const missingHeight = !/\bheight=["']/i.test(tag) ? ` height="${size.height}"` : "";
      const enriched = tag.replace(/\s*\/?>$/, (ending) => `${missingWidth}${missingHeight}${ending}`);
      output = output.slice(0, match.index) + enriched + output.slice(match.index + tag.length);
      changed += 1;
    } catch (error) {
      console.warn(`[image-metadata] skipped ${assetPath}: ${error.message}`);
    }
  }

  if (output !== input) await writeFile(absolutePath, output, "utf8");
  console.log(`[image-metadata] ${relativePath}: ${changed} tag(s) enriched`);
}

for (const file of files) await enrichHtml(file);
