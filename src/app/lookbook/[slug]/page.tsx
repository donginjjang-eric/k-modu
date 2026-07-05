// 공개 룩북: 자동 배치 매거진 — 커버→인트로→룩 페이지→상품 인덱스→백커버(QR)
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getPublishedLookbookBySlug } from "@/lib/db";
import { buildLookbookPages } from "@/lib/lookbook-pages";
import LookbookViewer from "@/components/LookbookViewer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lookbook = await getPublishedLookbookBySlug(slug);
  if (!lookbook) return { title: "Lookbook | K-MODU" };
  return {
    title: `${lookbook.title} — ${lookbook.designer_brand_name} Lookbook | K-MODU`,
    description: lookbook.tagline || `${lookbook.designer_brand_name}의 룩북`,
  };
}

export default async function PublicLookbookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lookbook = await getPublishedLookbookBySlug(slug);
  if (!lookbook) notFound();

  const created = new Date(lookbook.created_at);
  const season = Number.isNaN(created.getTime())
    ? ""
    : `${created.getFullYear()}.${String(created.getMonth() + 1).padStart(2, "0")}`;

  // 영어판은 룩북에 저장된 번역 인트로를 우선 사용
  const description = lookbook.intro || lookbook.designer_description || "";
  const mood = lookbook.designer_mood || "";
  const { pages, coverImage, lookCount } = buildLookbookPages(lookbook.items, {
    hasIntro: Boolean(description || mood),
    layouts: lookbook.layouts,
  });

  // 인쇄물 → 웹 연결용 QR (절대 주소 필요)
  const headerList = await headers();
  const host = headerList.get("host") || "www.k-modu.co.kr";
  const proto = headerList.get("x-forwarded-proto") || "https";
  const absoluteUrl = `${proto}://${host}/lookbook/${slug}`;
  const qrDataUrl = await QRCode.toDataURL(absoluteUrl, { margin: 1, width: 240, color: { dark: "#111111", light: "#ffffff" } })
    .catch(() => "");

  return (
    <LookbookViewer
      brand={lookbook.designer_brand_name}
      title={lookbook.title}
      tagline={lookbook.tagline}
      season={season}
      description={description}
      mood={mood}
      designerId={lookbook.designer_id}
      coverImage={coverImage}
      lookCount={lookCount}
      qrDataUrl={qrDataUrl}
      pages={pages}
      lang={lookbook.lang === "en" ? "en" : "ko"}
    />
  );
}
