// 공개 페이지(HTML/CSS)가 실제 참조하는 큰 이미지(>120KB)를 WebP로 변환하고 참조를 자동 교체.
// 원본 파일은 남겨둔다(누락된 참조가 있어도 깨지지 않음). 변환·교체 결과를 리포트.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const SCAN_FILES = ["index.html", "designers.html", "creators.html", "apply.html", "platform.css"]
  .map((f) => path.join(root, f))
  .filter((f) => fs.existsSync(f));
const MIN_BYTES = 120 * 1024;
const RE = /assets\/[A-Za-z0-9._\/-]+\.(?:png|jpg|jpeg)/g;

// 1) 스캔 파일에서 참조된 이미지 경로 수집
const referenced = new Set();
const fileText = new Map();
for (const f of SCAN_FILES) {
  const text = fs.readFileSync(f, "utf8");
  fileText.set(f, text);
  for (const m of text.matchAll(RE)) referenced.add(m[0]);
}

// 2) 실제 존재 + 용량 기준 통과한 것만 변환 대상
const targets = [];
for (const rel of referenced) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  if (fs.statSync(abs).size < MIN_BYTES) continue;
  targets.push(rel);
}

let beforeTotal = 0, afterTotal = 0, converted = 0;
const mapping = new Map(); // oldRel -> newRel(.webp)
for (const rel of targets) {
  const abs = path.join(root, rel);
  const webpRel = rel.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  const webpAbs = path.join(root, webpRel);
  const before = fs.statSync(abs).size;
  try {
    await sharp(abs).webp({ quality: 82, effort: 5 }).toFile(webpAbs);
    const after = fs.statSync(webpAbs).size;
    beforeTotal += before; afterTotal += after; converted += 1;
    mapping.set(rel, webpRel);
    console.log(`${(before/1024).toFixed(0).padStart(5)}KB → ${(after/1024).toFixed(0).padStart(5)}KB  ${rel}`);
  } catch (e) {
    console.log(`[skip] ${rel}: ${e.message}`);
  }
}

// 3) 스캔 파일의 참조를 .webp로 교체
let edits = 0;
for (const [f, text] of fileText) {
  let out = text;
  for (const [oldRel, newRel] of mapping) {
    if (out.includes(oldRel)) { out = out.split(oldRel).join(newRel); edits += 1; }
  }
  if (out !== text) fs.writeFileSync(f, out);
}

console.log(`\n변환 ${converted}개 · 참조 교체 ${edits}건`);
console.log(`총 용량: ${(beforeTotal/1024/1024).toFixed(1)}MB → ${(afterTotal/1024/1024).toFixed(1)}MB (${beforeTotal? Math.round((1-afterTotal/beforeTotal)*100):0}% 절감)`);
