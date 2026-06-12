// assets/ 내 어떤 코드에서도 참조되지 않는 고아 이미지 후보를 찾는 일회성 점검 스크립트
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const corpusFiles = [];
const skipDirs = new Set(["node_modules", ".next", ".git", "assets", "outputs", "etc", ".runtime", "mail_data"]);
const exts = new Set([".html", ".css", ".js", ".ts", ".tsx", ".mjs", ".json", ".md"]);

const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!skipDirs.has(e.name)) walk(p);
    } else if (exts.has(path.extname(e.name))) {
      corpusFiles.push(p);
    }
  }
};
walk(root);
const corpus = corpusFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

const assetFiles = [];
const walkAssets = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkAssets(p);
    else assetFiles.push(p);
  }
};
walkAssets(path.join(root, "assets"));

let safeTotal = 0;
let safeCount = 0;
for (const f of assetFiles) {
  const base = path.basename(f);
  if (corpus.includes(base)) continue;
  const rel = path.relative(root, f).replace(/\\/g, "/");
  const dirRel = path.dirname(rel) + "/";
  const dynRisk = corpus.includes(dirRel);
  const size = fs.statSync(f).size;
  if (!dynRisk) {
    safeTotal += size;
    safeCount += 1;
  }
  console.log(`${dynRisk ? "[보류:디렉터리참조] " : ""}${rel}\t${(size / 1024 / 1024).toFixed(2)}MB`);
}
console.log(`\n안전 삭제 후보: ${safeCount}건, ${(safeTotal / 1024 / 1024).toFixed(1)}MB`);
