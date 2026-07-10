import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "assets", "home-carousel");
await mkdir(outputDirectory, { recursive: true });

let before = 0;
let after = 0;
for (let index = 1; index <= 8; index += 1) {
  const suffix = String(index).padStart(2, "0");
  const input = path.join(root, "assets", `designer-profile-${suffix}.webp`);
  const output = path.join(outputDirectory, `designer-profile-${suffix}-640.webp`);
  before += (await stat(input)).size;
  await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toFile(output);
  after += (await stat(output)).size;
}

console.log(`[home-thumbnails] ${(before / 1024).toFixed(0)} KiB -> ${(after / 1024).toFixed(0)} KiB`);
