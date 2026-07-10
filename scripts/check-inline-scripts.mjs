import { readFile } from "node:fs/promises";
import vm from "node:vm";

const files = process.argv.slice(2);
const targets = files.length ? files : ["index.html", "creators.html", "designers.html"];

for (const file of targets) {
  const html = await readFile(file, "utf8");
  let parsed = 0;
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (/\btype=["']application\/ld\+json["']/i.test(match[0])) continue;
    parsed += 1;
    new vm.Script(match[1], { filename: `${file}:inline-${parsed}` });
  }
  console.log(`[inline-scripts] ${file}: ${parsed} script(s) OK`);
}
