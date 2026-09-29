// 실제 게시물 사진과 인물 없는 배경으로 신규 미팅 크리에이터 카드를 제작한다.
import { readFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const rosterDir = path.join(root, "docs/creator-roster-2026-09-29");
const creators = JSON.parse(await readFile(path.join(rosterDir, "source-manifest.json"), "utf8"));
const cardDir = path.join(root, "assets/influencer-sourcing/cards/malaysia-new-meeting");
const thumbDir = path.join(root, "assets/creator-thumbnails");
await mkdir(cardDir, { recursive: true });
await mkdir(thumbDir, { recursive: true });

const themes = [
  { bg: "ivory", ink: "#25201d", accent: "#ae8050", panel: "#f8f3e9" },
  { bg: "charcoal", ink: "#f9f2e9", accent: "#d7b98a", panel: "#201d1d" },
  { bg: "blush", ink: "#442c36", accent: "#ab667d", panel: "#f8e9eb" },
  { bg: "cobalt", ink: "#153555", accent: "#427bab", panel: "#e6f2f8" },
  { bg: "olive", ink: "#34402e", accent: "#798861", panel: "#edf0e4" },
];
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const text = (x, y, value, size, color, font = "Georgia", extra = "") =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${color}" ${extra}>${esc(value)}</text>`;
const svg = (content) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">${content}</svg>`);

for (const [index, creator] of creators.entries()) {
  const output = path.join(cardDir, `${creator.slug}.webp`);
  if (creator.slug === "aweenzul") {
    await copyFile(path.join(rosterDir, "aweenzul-pilot-final.webp"), output);
  } else {
    const theme = themes[index % themes.length];
    const layout = index % 5;
    const background = path.join(rosterDir, "backgrounds", `${theme.bg}.webp`);
    const source = path.join(root, creator.sourceFile);
    const cropped = creator.cropTop ? await sharp(source).extract({ left: 0, top: creator.cropTop, width: creator.width, height: creator.height - creator.cropTop }).toBuffer() : await readFile(source);
    const boxes = [
      { x: 58, y: 170, w: 784, h: 830 },
      { x: 0, y: 0, w: 900, h: 975 },
      { x: 86, y: 270, w: 728, h: 740 },
      { x: 145, y: 135, w: 700, h: 880 },
      { x: 40, y: 70, w: 820, h: 910 },
    ];
    const b = boxes[layout];
    const photo = await sharp(cropped).resize(b.w, b.h, { fit: "contain", background: theme.panel }).png().toBuffer();
    const rules = `<path d="M60 1130H840" stroke="${theme.accent}" stroke-width="2"/>`;
    const header = text(60, 86, "K-MODU  /  MALAYSIA", 25, theme.ink, "Arial", 'letter-spacing="5"') +
      text(840, 86, String(index + 1).padStart(2, "0"), 26, theme.accent, "Arial", 'text-anchor="end"');
    const footer = text(60, 1173, `INSTAGRAM  @${creator.instagram}`, 23, theme.ink, "Arial", 'letter-spacing="2"') +
      text(840, 1173, "CREATOR", 20, theme.accent, "Arial", 'text-anchor="end" letter-spacing="3"');
    let overlay;
    if (layout === 0) {
      overlay = header + `<rect x="48" y="160" width="804" height="850" fill="none" stroke="${theme.accent}" stroke-width="3"/>` +
        text(60, 1084, creator.name.toUpperCase(), creator.name.length > 11 ? 68 : 82, theme.ink) + rules + footer;
    } else if (layout === 1) {
      overlay = `<rect x="0" y="0" width="900" height="114" fill="${theme.panel}"/>` + header +
        `<rect x="0" y="965" width="900" height="235" fill="${theme.panel}"/>` +
        text(52, 1065, creator.name.toUpperCase(), creator.name.length > 11 ? 65 : 83, theme.ink) + rules + footer;
    } else if (layout === 2) {
      overlay = header + text(60, 204, creator.name.toUpperCase(), creator.name.length > 11 ? 61 : 79, theme.ink) +
        `<path d="M60 228H840" stroke="${theme.accent}" stroke-width="3"/>` +
        `<rect x="78" y="262" width="744" height="756" fill="none" stroke="${theme.accent}" stroke-width="4"/>` +
        text(60, 1080, "PORTRAIT  /  2026", 28, theme.ink, "Arial", 'letter-spacing="4"') + rules + footer;
    } else if (layout === 3) {
      overlay = header + `<rect x="133" y="123" width="724" height="904" fill="none" stroke="${theme.accent}" stroke-width="3"/>` +
        `<rect x="48" y="870" width="804" height="247" fill="${theme.panel}" fill-opacity="0.94"/>` +
        text(65, 978, creator.name.toUpperCase(), creator.name.length > 11 ? 61 : 82, theme.ink) +
        text(68, 1055, "MALAYSIA  /  CREATOR", 25, theme.accent, "Arial", 'letter-spacing="5"') + rules + footer;
    } else {
      overlay = `<rect x="0" y="0" width="900" height="120" fill="${theme.panel}" fill-opacity="0.94"/>` + header +
        `<rect x="0" y="975" width="900" height="225" fill="${theme.panel}"/>` +
        text(55, 1067, creator.name.toUpperCase(), creator.name.length > 11 ? 63 : 84, theme.ink) + rules + footer;
    }
    await sharp(background).resize(900, 1200).composite([
      { input: photo, left: b.x, top: b.y },
      { input: svg(overlay), left: 0, top: 0 },
    ]).webp({ quality: 88 }).toFile(output);
  }
  for (const width of [360, 720]) {
    await sharp(output).resize({ width }).webp({ quality: 84 }).toFile(path.join(thumbDir, `${creator.slug}-${width}.webp`));
  }
  console.log(`${creator.name}: ${output}`);
}
