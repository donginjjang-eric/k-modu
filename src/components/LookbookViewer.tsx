"use client";

// 룩북 매거진 뷰어: 페이지 스냅 스크롤 + 키보드 넘김 + 페이지 카운터 + 인쇄(PDF)
import { useEffect, useRef, useState } from "react";
import type { LookbookItem } from "@/lib/types";

export type MagazineItem = LookbookItem & { no?: number };

export type MagazinePage =
  | { kind: "cover" }
  | { kind: "intro" }
  | { kind: "full"; items: MagazineItem[] }
  | { kind: "duo"; items: MagazineItem[] }
  | { kind: "hero"; items: MagazineItem[] }
  | { kind: "index"; items: MagazineItem[] }
  | { kind: "back" };

type Props = {
  brand: string;
  title: string;
  tagline: string;
  season: string;
  description: string;
  mood: string;
  designerId: string;
  coverImage: string;
  lookCount: number;
  qrDataUrl: string;
  pages: MagazinePage[];
};

function lookNo(item: MagazineItem) {
  return item.no ? `LOOK ${String(item.no).padStart(2, "0")}` : "";
}

function Media({ item, className }: { item: MagazineItem; className?: string }) {
  if (item.videoUrl) {
    return <video className={className} src={item.videoUrl} poster={item.imageUrl} controls muted playsInline loop preload="metadata" />;
  }
  return <img className={className} src={item.imageUrl} alt={item.label || "look"} loading="lazy" />;
}

export default function LookbookViewer(props: Props) {
  const { brand, title, tagline, season, description, mood, designerId, coverImage, lookCount, qrDataUrl, pages } = props;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState(0);

  const goTo = (index: number) => {
    const shell = shellRef.current;
    if (!shell) return;
    const clamped = Math.max(0, Math.min(pages.length - 1, index));
    shell.scrollTo({ top: clamped * shell.clientHeight, behavior: "smooth" });
  };

  // 현재 페이지 추적 (카운터 표시)
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const onScroll = () => {
      setCurrent(Math.round(shell.scrollTop / Math.max(1, shell.clientHeight)));
    };
    shell.addEventListener("scroll", onScroll, { passive: true });
    return () => shell.removeEventListener("scroll", onScroll);
  }, []);

  // 키보드로 페이지 넘김 (매거진 감각)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        goTo(Math.round((shellRef.current?.scrollTop || 0) / Math.max(1, shellRef.current?.clientHeight || 1)) + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goTo(Math.round((shellRef.current?.scrollTop || 0) / Math.max(1, shellRef.current?.clientHeight || 1)) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);

  return (
    <div className="lbm-root">
      {/* 화면 전용 UI (인쇄 시 숨김) */}
      <div className="lbm-ui" aria-hidden="false">
        <span className="lbm-ui-brand">{brand} — LOOKBOOK</span>
        <div className="lbm-ui-right">
          <span className="lbm-ui-count">{Math.min(current + 1, pages.length)} / {pages.length}</span>
          <button type="button" onClick={() => window.print()}>인쇄 · PDF</button>
        </div>
      </div>
      <div className="lbm-arrows">
        <button type="button" aria-label="이전 페이지" disabled={current === 0} onClick={() => goTo(current - 1)}>↑</button>
        <button type="button" aria-label="다음 페이지" disabled={current >= pages.length - 1} onClick={() => goTo(current + 1)}>↓</button>
      </div>

      <main className="lbm" ref={shellRef}>
        {pages.map((page, index) => {
          if (page.kind === "cover") {
            return (
              <section className="lbm-pg lbm-cover" key={index}>
                {coverImage ? <img className="lbm-cover-img" src={coverImage} alt={`${brand} cover`} /> : null}
                <div className="lbm-cover-copy">
                  <p className="lbm-kicker">{brand}</p>
                  <h1>{title}</h1>
                  {tagline ? <p className="lbm-tagline">{tagline}</p> : null}
                  <p className="lbm-meta">{season ? `${season} · ` : ""}{lookCount} LOOKS · K-MODU LOOKBOOK</p>
                </div>
              </section>
            );
          }
          if (page.kind === "intro") {
            return (
              <section className="lbm-pg lbm-intro" key={index}>
                <p className="lbm-kicker dark">ABOUT {brand}</p>
                {description ? <p className="lbm-intro-copy">{description}</p> : null}
                {mood ? <p className="lbm-intro-mood">{mood}</p> : null}
              </section>
            );
          }
          if (page.kind === "full") {
            const item = page.items[0];
            return (
              <section className="lbm-pg lbm-full" key={index}>
                <Media item={item} className="lbm-full-media" />
                <figcaption className="lbm-cap"><b>{lookNo(item)}</b>{item.label ? <span>{item.label}</span> : null}</figcaption>
              </section>
            );
          }
          if (page.kind === "duo") {
            return (
              <section className="lbm-pg lbm-duo" key={index}>
                <div className="lbm-duo-grid">
                  {page.items.map((item, i) => (
                    <figure key={i}>
                      <Media item={item} />
                      <figcaption className="lbm-cap"><b>{lookNo(item)}</b>{item.label ? <span>{item.label}</span> : null}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            );
          }
          if (page.kind === "hero") {
            const [big, ...small] = page.items;
            return (
              <section className="lbm-pg lbm-hero" key={index}>
                <div className="lbm-hero-grid">
                  <figure className="lbm-hero-big">
                    <Media item={big} />
                    <figcaption className="lbm-cap"><b>{lookNo(big)}</b>{big.label ? <span>{big.label}</span> : null}</figcaption>
                  </figure>
                  <div className="lbm-hero-side">
                    {small.map((item, i) => (
                      <figure key={i}>
                        <Media item={item} />
                        <figcaption className="lbm-cap"><b>{lookNo(item)}</b></figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          if (page.kind === "index") {
            return (
              <section className="lbm-pg lbm-index" key={index}>
                <p className="lbm-kicker dark">PRODUCTS</p>
                <h2>상품 인덱스</h2>
                <div className="lbm-index-grid">
                  {page.items.map((item, i) => (
                    <figure key={i}>
                      <img src={item.imageUrl} alt={item.label || "product"} loading="lazy" />
                      <figcaption>{item.label || "제품"}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            );
          }
          return (
            <section className="lbm-pg lbm-back" key={index}>
              <p className="lbm-kicker dark">{brand}</p>
              <h2>WORK WITH US</h2>
              <p className="lbm-back-copy">이 브랜드가 마음에 드셨다면, K-MODU에서 바로 협업을 제안해보세요.</p>
              <a className="lbm-cta" href={`/designers?open=${designerId}`}>이 브랜드와 협업 제안하기</a>
              {qrDataUrl ? (
                <div className="lbm-qr">
                  <img src={qrDataUrl} alt="웹 룩북 QR 코드" />
                  <span>QR을 찍으면 이 룩북이 열려요</span>
                </div>
              ) : null}
              <a className="lbm-home" href="/">K-MODU — K-FASHION CREATOR MATCHING</a>
            </section>
          );
        })}
      </main>
    </div>
  );
}
