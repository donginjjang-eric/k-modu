import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [source, slug] = process.argv.slice(2);

if (!source || !slug) {
  throw new Error("Usage: node scripts/import-creator-card-image.mjs <source-image> <slug>");
}

if (!/^[a-z0-9-]+$/.test(slug)) {
  throw new Error("The image slug may only contain lowercase letters, numbers, and hyphens.");
}

const root = path.resolve(import.meta.dirname, "..");
const sourceDir = path.join(root, "assets", "influencer-sourcing", "cards", "vietnam-beauty");
const thumbnailDir = path.join(root, "assets", "creator-thumbnails");

await Promise.all([
  mkdir(sourceDir, { recursive: true }),
  mkdir(thumbnailDir, { recursive: true }),
]);

const profilePath = path.join(sourceDir, `${slug}.webp`);
await sharp(source, { failOn: "error" })
  .rotate()
  .webp({ quality: 88, effort: 6, smartSubsample: true })
  .toFile(profilePath);

for (const width of [360, 720]) {
  await sharp(source, { failOn: "error" })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6, smartSubsample: true })
    .toFile(path.join(thumbnailDir, `${slug}-${width}.webp`));
}

console.log(`Imported creator card image: ${slug}`);
