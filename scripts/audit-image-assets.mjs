import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = path.join(root, "assets");
const baselinePath = path.join(root, "data", "image-budget-baseline.json");
const imageExts = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const strict = process.argv.includes("--strict");
const writeBaseline = process.argv.includes("--write-baseline");

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (imageExts.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
  }
  return files;
}

const files = await walk(assetsRoot);
const records = [];
const hashes = new Map();
const byExtension = {};

for (const absolute of files) {
  const details = await stat(absolute);
  const relative = path.relative(assetsRoot, absolute).replaceAll("\\", "/");
  const extension = path.extname(relative).toLowerCase();
  const buffer = await readFile(absolute);
  const hash = createHash("sha256").update(buffer).digest("hex");
  records.push({ relative, extension, bytes: details.size, hash });
  byExtension[extension] = (byExtension[extension] || 0) + details.size;
  hashes.set(hash, [...(hashes.get(hash) || []), relative]);
}

const duplicateGroups = [...hashes.entries()]
  .filter(([, paths]) => paths.length > 1)
  .map(([hash, paths]) => ({ hash, paths, bytes: records.find((item) => item.hash === hash)?.bytes || 0 }));
const duplicateBytes = duplicateGroups.reduce((total, group) => total + group.bytes * (group.paths.length - 1), 0);
const largeFiles = records.filter((item) => item.bytes > 1024 * 1024).sort((a, b) => b.bytes - a.bytes);
const metrics = {
  fileCount: records.length,
  totalBytes: records.reduce((total, item) => total + item.bytes, 0),
  largestBytes: Math.max(0, ...records.map((item) => item.bytes)),
  overOneMiBCount: largeFiles.length,
  duplicateBytes,
};

const report = {
  generatedAt: new Date().toISOString(),
  metrics,
  byExtension,
  largest: records.sort((a, b) => b.bytes - a.bytes).slice(0, 20).map(({ relative, bytes }) => ({ relative, bytes })),
  duplicateGroups: duplicateGroups.slice(0, 50).map(({ paths, bytes }) => ({ paths, bytes })),
};

if (writeBaseline) {
  await writeFile(baselinePath, `${JSON.stringify({ metrics }, null, 2)}\n`, "utf8");
  console.log(`[image-audit] baseline updated: ${path.relative(root, baselinePath)}`);
}

const formatMiB = (bytes) => `${(bytes / 1048576).toFixed(2)} MiB`;
console.log(`[image-audit] ${metrics.fileCount} images, ${formatMiB(metrics.totalBytes)}`);
console.log(`[image-audit] ${metrics.overOneMiBCount} files over 1 MiB, ${formatMiB(metrics.duplicateBytes)} exact duplicate bytes`);
console.log(`[image-audit] largest: ${report.largest.slice(0, 5).map((item) => `${item.relative} (${formatMiB(item.bytes)})`).join(", ")}`);

if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));

if (strict) {
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const regressions = Object.entries(metrics).filter(([key, value]) => value > baseline.metrics[key]);
  if (regressions.length) {
    for (const [key, value] of regressions) {
      console.error(`[image-audit] budget regression: ${key} ${value} > ${baseline.metrics[key]}`);
    }
    process.exitCode = 1;
  }
}
