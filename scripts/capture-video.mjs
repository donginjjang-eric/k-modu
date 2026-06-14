// process-motion.html을 결정적 프레임으로 캡처해 PNG 시퀀스로 저장 (ffmpeg가 mp4로 합성)
import puppeteer from "puppeteer";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "video", "process-motion.html");
const framesDir = path.join(root, "video", "frames");
const FPS = 24;
const TOTAL = 25; // process-motion.html의 TOTAL과 일치
const W = 1280, H = 720;

rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--force-color-profile=srgb"] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });
await page.evaluate(() => window.__stop());

const stage = await page.$("#stage");
const totalFrames = Math.round(TOTAL * FPS);
for (let i = 0; i < totalFrames; i += 1) {
  const t = i / FPS;
  await page.evaluate((tt) => window.render(tt), t);
  const name = String(i + 1).padStart(4, "0");
  await stage.screenshot({ path: path.join(framesDir, `f-${name}.png`) });
  if (i % 24 === 0) console.log(`[capture] ${i + 1}/${totalFrames} (${t.toFixed(1)}s)`);
}
console.log(`[capture] done — ${totalFrames} frames`);
await browser.close();
