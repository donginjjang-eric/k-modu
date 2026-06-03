// 이미지 제자리 최적화: assets/ 하위 PNG/JPG를 표시 크기로 리사이즈 + 재압축.
// 파일명·확장자·경로 유지 → HTML/CSS/JS/TS 참조 변경 불필요(이미지 깨질 위험 0).
//
// 사용법:
//   node scripts/optimize-images.mjs --dry-run   # 변경 없이 절감 예상 리포트만
//   node scripts/optimize-images.mjs             # 실제 제자리 덮어쓰기
//
// 백업은 git 이력으로 충분(에셋은 이미 커밋됨). 되돌리려면 `git checkout -- assets`.

import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "assets");
const dryRun = process.argv.includes("--dry-run");

// 확장자별 재인코딩 설정
const PNG_OPTS = { compressionLevel: 9, palette: true, quality: 80, effort: 10 };
const JPG_OPTS = { quality: 78, mozjpeg: true };

// 리사이즈 상한(긴 변 px). 파일명 패턴으로 용도별 차등.
const DEFAULT_MAX = 1600;
const SMALL_MAX = 480; // 로고/아이콘류
const SKIP_RESIZE_NAMES = new Set(["og-image.png", "favicon.png"]); // 규격 유지/리사이즈 생략
const SMALL_NAME_HINTS = ["logo", "favicon", "icon"];
const MIN_BYTES = 8 * 1024; // 8KB 미만은 건너뜀(이득 적음)

const fmtMB = (b) => (b / 1048576).toFixed(2) + " MB";

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function maxEdgeFor(name) {
  const lower = name.toLowerCase();
  if (SMALL_NAME_HINTS.some((h) => lower.includes(h))) return SMALL_MAX;
  return DEFAULT_MAX;
}

async function processFile(file) {
  const name = path.basename(file);
  const ext = path.extname(file).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) return null;

  const before = (await stat(file)).size;
  if (before < MIN_BYTES) return { file, name, before, after: before, skipped: "small" };

  const input = await readFile(file);
  let pipeline = sharp(input, { failOn: "none" });
  const meta = await pipeline.metadata();

  // 리사이즈(확대 금지)
  if (!SKIP_RESIZE_NAMES.has(name)) {
    const maxEdge = maxEdgeFor(name);
    const longest = Math.max(meta.width || 0, meta.height || 0);
    if (longest > maxEdge) {
      pipeline = pipeline.resize({
        width: meta.width >= meta.height ? maxEdge : undefined,
        height: meta.height > meta.width ? maxEdge : undefined,
        withoutEnlargement: true,
        fit: "inside",
      });
    }
  }

  // 재인코딩(확장자 유지, 알파 보존)
  if (ext === ".png") pipeline = pipeline.png(PNG_OPTS);
  else pipeline = pipeline.jpeg(JPG_OPTS);

  const output = await pipeline.toBuffer();

  // 최적화 결과가 더 크면 원본 유지(절대 키우지 않음)
  if (output.length >= before) return { file, name, before, after: before, skipped: "no-gain" };

  if (!dryRun) await writeFile(file, output);
  return { file, name, before, after: output.length, w: meta.width, h: meta.height };
}

async function main() {
  const files = (await walk(assetsDir)).filter((f) =>
    [".png", ".jpg", ".jpeg"].includes(path.extname(f).toLowerCase())
  );

  let totalBefore = 0;
  let totalAfter = 0;
  let changed = 0;
  const rows = [];

  for (const file of files) {
    try {
      const r = await processFile(file);
      if (!r) continue;
      totalBefore += r.before;
      totalAfter += r.after;
      if (!r.skipped && r.after < r.before) {
        changed++;
        rows.push(r);
      }
    } catch (e) {
      console.error("FAIL", path.relative(root, file), e.message);
    }
  }

  // 절감 큰 순 상위 20개
  rows.sort((a, b) => b.before - b.after - (a.before - a.after));
  console.log(`\n${dryRun ? "[DRY-RUN] " : ""}상위 절감 파일:`);
  for (const r of rows.slice(0, 20)) {
    const pct = Math.round((1 - r.after / r.before) * 100);
    console.log(
      `  ${fmtMB(r.before)} -> ${fmtMB(r.after)}  (-${pct}%)  ${path.relative(assetsDir, r.file)}`
    );
  }

  console.log(`\n${dryRun ? "[DRY-RUN] " : ""}요약`);
  console.log(`  대상 이미지: ${files.length}개, 변경: ${changed}개`);
  console.log(`  합계: ${fmtMB(totalBefore)} -> ${fmtMB(totalAfter)}  (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);
  if (dryRun) console.log(`  (실제 적용하려면 --dry-run 없이 다시 실행)`);
}

main();
