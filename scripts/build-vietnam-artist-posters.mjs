// 베트남 아티스트의 실제 게시물 사진으로 공개 프로필 카드를 제작한다.
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const artists = JSON.parse(await readFile("docs/vietnam-artists-2026-09-29/source-manifest.json", "utf8"));
const cardDir = path.join(root, "assets/influencer-sourcing/cards/vietnam-artists");
const thumbDir = path.join(root, "assets/creator-thumbnails");
await mkdir(cardDir, { recursive: true });
await mkdir(thumbDir, { recursive: true });

const designs = [
  { bg: "ivory", x: 68, y: 88, w: 764, h: 894, ink: "#292021", accent: "#b28566", panel: "#f9f1e6", kind: 0 },
  { bg: "blush", x: 42, y: 194, w: 816, h: 796, ink: "#4c283d", accent: "#a34f73", panel: "#f7e8ef", kind: 1 },
  { bg: "charcoal", x: 0, y: 0, w: 900, h: 970, ink: "#f8eee0", accent: "#c9a573", panel: "#242125", kind: 2 },
  { bg: "ivory", x: 112, y: 142, w: 676, h: 860, ink: "#6b1b2b", accent: "#b1374d", panel: "#fff4ef", kind: 3 },
  { bg: "cobalt", x: 0, y: 130, w: 900, h: 850, ink: "#153149", accent: "#37759c", panel: "#e9f3f7", kind: 4 },
  { bg: "olive", x: 84, y: 135, w: 732, h: 880, ink: "#34402f", accent: "#7d8e5a", panel: "#f0f1e8", kind: 5 },
  { bg: "charcoal", x: 55, y: 80, w: 790, h: 890, ink: "#fff0df", accent: "#d5ad86", panel: "#322335", kind: 6 },
];
const escapeXml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const label = (x, y, value, size, color, extra = "") => `<text x="${x}" y="${y}" font-family="Georgia, serif" font-size="${size}" fill="${color}" ${extra}>${escapeXml(value)}</text>`;
const svg = (content) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">${content}</svg>`);

for (const [index, artist] of artists.entries()) {
  const design = designs[index];
  const source = path.join(root, artist.sourceFile);
  const { x, y, w, h, ink, accent, panel, kind } = design;
  const photograph = await sharp(source).resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const softFill = await sharp(source).resize(w, h, { fit: "cover" }).blur(30).png().toBuffer();
  const nameSize = artist.name.length > 13 ? 65 : artist.name.length > 9 ? 76 : 100;
  const top = label(55, 67, "K-MODU  /  VIETNAM ARTIST", 23, ink, 'letter-spacing="3"') +
    label(845, 67, String(index + 1).padStart(2, "0"), 25, accent, 'text-anchor="end"');
  const foot = label(55, 1170, `INSTAGRAM  @${artist.instagram}`, 23, ink, 'letter-spacing="2"') +
    label(845, 1170, "PUBLIC PROFILE", 20, accent, 'text-anchor="end"');
  const rule = `<path d="M55 1127H845" stroke="${accent}" stroke-width="2"/>`;
  const name = label(55, 1080, artist.name.toUpperCase(), nameSize, ink);
  let overlay;
  if (kind === 0) overlay = top + `<rect x="52" y="75" width="796" height="923" fill="none" stroke="${accent}" stroke-width="3"/>` +
    `<rect y="982" width="900" height="218" fill="${panel}"/>` + name + rule + foot;
  else if (kind === 1) overlay = top + label(55, 145, artist.name.toUpperCase(), nameSize, ink) +
    `<rect x="32" y="184" width="836" height="816" fill="none" stroke="${accent}" stroke-width="3"/>` +
    `<rect y="1000" width="900" height="200" fill="${panel}"/>` + label(55, 1080, "MUSIC  /  FASHION", 39, ink) + rule + foot;
  else if (kind === 2) overlay = `<rect y="0" width="900" height="100" fill="${panel}"/>` + top +
    `<rect y="962" width="900" height="238" fill="${panel}"/>` + name + rule + foot;
  else if (kind === 3) overlay = top + `<rect x="96" y="126" width="708" height="892" fill="none" stroke="${accent}" stroke-width="4"/>` +
    `<rect x="24" y="955" width="852" height="205" fill="${panel}" fill-opacity="0.95"/>` + name + rule + foot;
  else if (kind === 4) overlay = `<rect y="0" width="900" height="120" fill="${panel}"/>` + top +
    `<rect y="978" width="900" height="222" fill="${panel}"/>` + name + rule + foot;
  else if (kind === 5) overlay = top + `<rect x="69" y="120" width="762" height="910" fill="none" stroke="${accent}" stroke-width="3"/>` +
    `<rect y="1020" width="900" height="180" fill="${panel}"/>` + name + rule + foot;
  else overlay = top + `<rect x="42" y="67" width="816" height="916" fill="none" stroke="${accent}" stroke-width="3"/>` +
    `<rect y="966" width="900" height="234" fill="${panel}"/>` + name + rule + foot;

  const card = path.join(cardDir, `${artist.slug}.webp`);
  await sharp(path.join(root, "docs/creator-roster-2026-09-29/backgrounds", `${design.bg}.webp`))
    .resize(900, 1200).composite([
      { input: softFill, left: x, top: y },
      { input: photograph, left: x, top: y },
      { input: svg(overlay), left: 0, top: 0 },
    ]).webp({ quality: 88 }).toFile(card);
  for (const width of [360, 720]) {
    await sharp(card).resize({ width }).webp({ quality: 84 }).toFile(path.join(thumbDir, `${artist.slug}-${width}.webp`));
  }
  console.log(`${artist.name}: ${card}`);
}
