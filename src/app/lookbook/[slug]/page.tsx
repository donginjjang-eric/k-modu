// 공개 룩북 페이지: 링크 하나로 크리에이터·바이어에게 보내는 세로 스크롤 매거진
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedLookbookBySlug } from "@/lib/db";

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

  return (
    <main className="lookbook-page">
      <header className="lb-cover">
        <p className="lb-brand">{lookbook.designer_brand_name}</p>
        <h1>{lookbook.title}</h1>
        {lookbook.tagline ? <p className="lb-tagline">{lookbook.tagline}</p> : null}
        <p className="lb-meta">
          {season ? `${season} · ` : ""}{lookbook.items.length} LOOKS · K-MODU LOOKBOOK
        </p>
      </header>

      <section className="lb-stream">
        {lookbook.items.map((item, index) => (
          <figure key={`${item.type}-${item.refId}-${index}`}>
            {item.videoUrl ? (
              <video src={item.videoUrl} controls playsInline muted loop preload="metadata" poster={item.imageUrl} />
            ) : (
              <img src={item.imageUrl} alt={item.label || `${lookbook.designer_brand_name} look ${index + 1}`} loading={index < 2 ? "eager" : "lazy"} />
            )}
            <figcaption>
              <span className="lb-no">{String(index + 1).padStart(2, "0")}</span>
              {item.label ? <span>{item.label}</span> : null}
            </figcaption>
          </figure>
        ))}
      </section>

      <footer className="lb-footer">
        <p>{lookbook.designer_description || lookbook.designer_mood || lookbook.designer_brand_name}</p>
        <a className="lb-cta" href={`/designers?open=${lookbook.designer_id}`}>
          이 브랜드와 협업 제안하기
        </a>
        <a className="lb-home" href="/">K-MODU — K-Fashion Creator Matching</a>
      </footer>
    </main>
  );
}
