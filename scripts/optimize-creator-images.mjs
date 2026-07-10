import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pagePath = path.join(root, "creators.html");
const outputDir = path.join(root, "assets", "creator-thumbnails");
const widths = [360, 720];
const dryRun = process.argv.includes("--dry-run");
const verbose = process.argv.includes("--verbose");

const page = await readFile(pagePath, "utf8");
const sourcePattern = /assets\/(?:inful|influencer-sourcing)\/[^"'`\s]+\.webp/g;
const sources = [...new Set(page.match(sourcePattern) || [])].sort();

if (sources.length === 0) {
  throw new Error("No creator card image sources were found in creators.html.");
}

const outputBasenames = new Map();
for (const source of sources) {
  const basename = path.basename(source, path.extname(source));
  const existing = outputBasenames.get(basename);
  if (existing && existing !== source) {
    throw new Error(`Thumbnail basename collision: ${existing} and ${source}`);
  }
  outputBasenames.set(basename, source);
}

if (!dryRun) await mkdir(outputDir, { recursive: true });

let originalBytes = 0;
const candidateBytes = new Map(widths.map((width) => [width, 0]));
const rows = [];

for (const source of sources) {
  const sourcePath = path.join(root, ...source.split("/"));
  const sourceStat = await stat(sourcePath);
  const metadata = await sharp(sourcePath).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions for ${source}`);
  }
  if (metadata.width < Math.max(...widths)) {
    throw new Error(`${source} is only ${metadata.width}px wide; srcset widths would be inaccurate.`);
  }

  originalBytes += sourceStat.size;
  const basename = path.basename(source, path.extname(source));
  const variants = [];

  for (const width of widths) {
    const outputName = `${basename}-${width}.webp`;
    const outputPath = path.join(outputDir, outputName);
    const output = await sharp(sourcePath, { failOn: "error" })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6, smartSubsample: true })
      .toBuffer();

    if (!dryRun) await writeFile(outputPath, output);
    candidateBytes.set(width, candidateBytes.get(width) + output.length);
    variants.push({ width, bytes: output.length });
  }

  rows.push({
    source,
    originalBytes: sourceStat.size,
    width: metadata.width,
    height: metadata.height,
    variants,
  });
}

const formatBytes = (bytes) => `${bytes.toLocaleString("en-US")} B`;
const savingPercent = (after) => Math.round((1 - after / originalBytes) * 100);

console.log(`${dryRun ? "[DRY RUN] " : ""}Creator thumbnails: ${sources.length} sources`);
console.log(`Original card source set: ${formatBytes(originalBytes)}`);
for (const width of widths) {
  const bytes = candidateBytes.get(width);
  console.log(`${width}w candidate set: ${formatBytes(bytes)} (-${savingPercent(bytes)}%)`);
}

if (verbose) {
  for (const row of rows) {
    const variants = row.variants
      .map((variant) => `${variant.width}w=${formatBytes(variant.bytes)}`)
      .join(", ");
    console.log(
      `${row.source} | ${row.width}x${row.height} | original=${formatBytes(row.originalBytes)} | ${variants}`,
    );
  }
}
