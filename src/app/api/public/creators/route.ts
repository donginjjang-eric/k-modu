import { readFile } from "node:fs/promises";
import path from "node:path";

type PublicCreator = {
  name: string;
  image: string;
  profileImage: string;
  platform: string;
  marketName: string;
  specialty: string;
  handle: string;
  fit: number;
  followers: number;
};

function attribute(source: string, name: string) {
  return source.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] || "";
}

function textContent(source: string, selector: string) {
  return source.match(new RegExp(`<${selector}\\b[^>]*>([\\s\\S]*?)<\\/${selector}>`, "i"))?.[1]
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "";
}

async function getCreators(): Promise<PublicCreator[]> {
  const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), "creators.html");
  const html = await readFile(filePath, "utf8");
  const gridStart = html.indexOf('<div class="creator-grid" id="creatorGrid">');
  const scriptStart = html.indexOf("<script>", gridStart);
  const gridSource = html.slice(gridStart, scriptStart > gridStart ? scriptStart : undefined);
  const cards = [...gridSource.matchAll(/<article\b([^>]*\bclass=["'][^"']*\bmarket-card\b[^"']*["'][^>]*)>([\s\S]*?)<\/article>/gi)];

  return cards.map(([, attributes, body]) => {
    const imageTag = body.match(/<img\b[^>]*>/i)?.[0] || "";
    const parts = textContent(body, "p").split("/").map((item) => item.trim());
    return {
      name: textContent(body, "h3"),
      image: attribute(imageTag, "src") || attribute(imageTag, "data-src"),
      profileImage: attribute(imageTag, "data-profile-src") || attribute(imageTag, "src") || attribute(imageTag, "data-src"),
      platform: attribute(attributes, "data-platform") || "TikTok",
      marketName: parts[0] || "Malaysia",
      specialty: parts[1] || "K-Fashion Styling",
      handle: parts[2] || "",
      fit: Number(attribute(attributes, "data-fit")) || 0,
      followers: Number(attribute(attributes, "data-followers")) || 0,
    };
  }).filter((creator) => creator.name && creator.image);
}

export async function GET() {
  const creators = (await getCreators()).sort((a, b) => b.fit - a.fit).slice(0, 8);
  return Response.json(
    { ok: true, creators },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
