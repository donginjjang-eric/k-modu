"use client";

// 룩북 편집기: 사진 업로드/자산 선택 → 페이지 미리보기에서 레이아웃·사진 배치 → 게시 + 내 룩북 관리
import { useEffect, useMemo, useRef, useState } from "react";
import NavIcon from "@/components/NavIcons";
import { LAYOUT_COUNT, buildLookbookPages, extractLookLayouts, isLookPage } from "@/lib/lookbook-pages";
import type { Lookbook, LookbookItem, LookbookLayout } from "@/lib/types";

const PAGE_LABEL: Record<string, string> = {
  cover: "표지", intro: "인트로", full: "룩 1장", duo: "룩 2장", hero: "룩 3장", grid: "룩 4장", index: "상품", back: "백커버",
};
const LAYOUT_LABEL: Record<LookbookLayout, string> = { full: "1장", duo: "2장", hero: "3장", grid: "4장" };

type Assets = {
  looks: { id: string; imageUrl: string; videoUrl: string | null }[];
  portfolio: { id: string; imageUrl: string; title: string }[];
  products: { id: string; imageUrl: string; name: string }[];
};

type Tab = "look" | "portfolio" | "product";

const TAB_LABEL: Record<Tab, string> = { look: "승인된 AI 룩", portfolio: "포트폴리오", product: "상품" };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default function LookbookManager({
  brandName,
  assets,
  initialLookbooks,
  hasIntro = true,
}: {
  brandName: string;
  assets: Assets;
  initialLookbooks: Lookbook[];
  hasIntro?: boolean;
}) {
  const [lookbooks, setLookbooks] = useState(initialLookbooks);
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [items, setItems] = useState<LookbookItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("look");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  // 내 사진 올리기: 업로드한 사진은 포트폴리오 자산으로 저장되고 구성에 바로 추가된다
  const [portfolioAssets, setPortfolioAssets] = useState(assets.portfolio);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 12);
    if (!imageFiles.length) {
      setMessage({ text: "이미지 파일만 올릴 수 있어요. (JPG·PNG·WEBP)", ok: false });
      return;
    }
    setUploading(true);
    setMessage(null);
    let added = 0;
    const failed: string[] = [];
    for (const file of imageFiles) {
      try {
        // 1) 파일 업로드 → 2) 포트폴리오(룩북 종류)로 등록 → 3) 구성에 자동 추가
        const body = new FormData();
        body.append("image", file);
        const uploadRes = await fetch("/api/uploads/portfolio-image", { method: "POST", body });
        const uploadResult = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadResult.imageUrl) throw new Error(uploadResult.error || "업로드 실패");

        const registerRes = await fetch("/api/designer/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: uploadResult.imageUrl,
            imageHash: uploadResult.imageHash || null,
            title: file.name.replace(/\.[^.]+$/, "").slice(0, 60),
            kind: "lookbook",
          }),
        });
        const registerResult = await registerRes.json().catch(() => ({}));
        if (!registerRes.ok || !registerResult.image) throw new Error(registerResult.error || "등록 실패");

        const image = registerResult.image as { id: string; image_url: string; title: string | null };
        setPortfolioAssets((current) => [{ id: image.id, imageUrl: image.image_url, title: image.title || "" }, ...current]);
        setItems((current) => (
          current.length >= 40
            ? current
            : [...current, { type: "portfolio", refId: image.id, imageUrl: image.image_url, videoUrl: null, label: image.title || "" }]
        ));
        added += 1;
      } catch (error) {
        failed.push(`${file.name}${error instanceof Error ? ` (${error.message})` : ""}`);
      }
    }
    setUploading(false);
    setActiveTab("portfolio");
    if (added && !failed.length) {
      setMessage({ text: `사진 ${added}장이 올라가고 구성에 바로 담겼어요. 순서만 정하고 게시하면 끝!`, ok: true });
    } else if (added) {
      setMessage({ text: `${added}장 추가 완료. 실패: ${failed.join(", ")}`, ok: true });
    } else {
      setMessage({ text: `업로드에 실패했어요: ${failed.join(", ")}`, ok: false });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const tabAssets = useMemo(() => {
    if (activeTab === "look") {
      return assets.looks.map((look) => ({
        key: `look:${look.id}`,
        item: { type: "look" as const, refId: look.id, imageUrl: look.imageUrl, videoUrl: look.videoUrl, label: "" },
        caption: look.videoUrl ? "숏폼 포함" : "",
      }));
    }
    if (activeTab === "portfolio") {
      return portfolioAssets.map((image) => ({
        key: `portfolio:${image.id}`,
        item: { type: "portfolio" as const, refId: image.id, imageUrl: image.imageUrl, videoUrl: null, label: image.title },
        caption: image.title,
      }));
    }
    return assets.products.map((product) => ({
      key: `product:${product.id}`,
      item: { type: "product" as const, refId: product.id, imageUrl: product.imageUrl, videoUrl: null, label: product.name },
      caption: product.name,
    }));
  }, [activeTab, assets, portfolioAssets]);

  const itemKey = (item: LookbookItem) => `${item.type}:${item.refId}`;
  const selectedOrder = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((item, index) => { map[itemKey(item)] = index + 1; });
    return map;
  }, [items]);

  // ── 페이지 편집: 자동 초안 + 페이지별 레이아웃 오버라이드 + 슬롯 사진 교체
  const [layouts, setLayouts] = useState<LookbookLayout[]>([]);
  const [selectedPageIdx, setSelectedPageIdx] = useState<number | null>(null);
  // 사진 교체 대기 중인 슬롯 (items 배열의 전역 인덱스)
  const [pickSlotIdx, setPickSlotIdx] = useState<number | null>(null);

  const built = useMemo(() => buildLookbookPages(items, { hasIntro, layouts }), [items, layouts, hasIntro]);
  const selectedPage = selectedPageIdx !== null ? built.pages[selectedPageIdx] : null;

  // 사진 수가 줄어 페이지가 사라지면 선택을 안전하게 보정
  useEffect(() => {
    if (selectedPageIdx !== null && selectedPageIdx >= built.pages.length) {
      setSelectedPageIdx(built.pages.length ? built.pages.length - 1 : null);
    }
  }, [built.pages.length, selectedPageIdx]);

  const changeLayout = (lookPageOrder: number, kind: LookbookLayout) => {
    const current = extractLookLayouts(built.pages);
    current[lookPageOrder] = kind;
    setLayouts(current);
    setPickSlotIdx(null);
  };

  const removeAt = (globalIndex: number) => {
    setItems((current) => current.filter((_, index) => index !== globalIndex));
    setPickSlotIdx(null);
  };

  const toggleItem = (item: LookbookItem) => {
    // 슬롯 교체 모드: 자산을 누르면 그 자리에 사진이 들어간다 (이미 담긴 사진이면 자리 맞교환)
    if (pickSlotIdx !== null) {
      setItems((current) => {
        if (pickSlotIdx >= current.length) return current;
        const next = [...current];
        const existing = next.findIndex((entry) => itemKey(entry) === itemKey(item));
        if (existing === pickSlotIdx) return current;
        if (existing >= 0) {
          [next[pickSlotIdx], next[existing]] = [next[existing], next[pickSlotIdx]];
        } else {
          next[pickSlotIdx] = item;
        }
        return next;
      });
      setPickSlotIdx(null);
      setMessage({ text: "사진을 바꿨어요. 페이지 미리보기에서 확인해보세요.", ok: true });
      return;
    }
    setItems((current) => {
      const key = itemKey(item);
      if (current.some((entry) => itemKey(entry) === key)) return current.filter((entry) => itemKey(entry) !== key);
      if (current.length >= 40) {
        setMessage({ text: "룩북에는 최대 40장까지 넣을 수 있어요.", ok: false });
        return current;
      }
      return [...current, item];
    });
  };

  const resetEditor = () => {
    setTitle("");
    setTagline("");
    setItems([]);
    setLayouts([]);
    setSelectedPageIdx(null);
    setPickSlotIdx(null);
    setEditingId(null);
  };

  const startEdit = (lookbook: Lookbook) => {
    setEditingId(lookbook.id);
    setTitle(lookbook.title);
    setTagline(lookbook.tagline);
    setItems(lookbook.items);
    setLayouts(lookbook.layouts || []);
    setSelectedPageIdx(null);
    setPickSlotIdx(null);
    setPublishedSlug(null);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/lookbook/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ text: "링크를 복사했어요. 크리에이터·바이어에게 그대로 붙여넣어 보내면 돼요.", ok: true });
    } catch {
      setMessage({ text: `복사가 안 되면 직접 복사해주세요: ${url}`, ok: false });
    }
  };

  const save = async () => {
    if (!title.trim()) {
      setMessage({ text: "룩북 제목을 입력해주세요. (예: 2026 F/W 컬렉션)", ok: false });
      return;
    }
    if (!items.length) {
      setMessage({ text: "아래에서 이미지를 1장 이상 선택해주세요.", ok: false });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(editingId ? `/api/lookbooks/${editingId}` : "/api/lookbooks", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), tagline: tagline.trim(), items, layouts: extractLookLayouts(built.pages) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.lookbook) throw new Error(result.error || "저장에 실패했어요. 다시 시도해주세요.");

      const saved = result.lookbook as Lookbook;
      setLookbooks((current) => {
        const rest = current.filter((entry) => entry.id !== saved.id);
        return [saved, ...rest];
      });
      setPublishedSlug(saved.slug);
      setMessage({ text: editingId ? "룩북을 수정했어요. 기존 링크 그대로 반영돼요." : "룩북이 게시됐어요! 아래 링크를 복사해 보내보세요.", ok: true });
      resetEditor();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "저장에 실패했어요.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  // AI 캡션: 룩 이미지에 짧은 한국어 캡션을 자동으로 채운다
  const [aiBusyId, setAiBusyId] = useState("");
  const runAiCaptions = async (lookbook: Lookbook) => {
    setAiBusyId(`${lookbook.id}:cap`);
    setMessage(null);
    try {
      const response = await fetch(`/api/lookbooks/${lookbook.id}/ai-captions`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.lookbook) throw new Error(result.error || "AI 캡션 생성에 실패했어요.");
      setLookbooks((current) => current.map((entry) => (entry.id === lookbook.id ? result.lookbook : entry)));
      setMessage({ text: "AI가 캡션을 채웠어요. '보기'에서 룩 아래 문구를 확인해보세요.", ok: true });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "AI 캡션 생성에 실패했어요.", ok: false });
    } finally {
      setAiBusyId("");
    }
  };

  // 영어판 만들기: 제목·문구·캡션·브랜드 소개를 번역한 새 영어 룩북 생성
  const makeEnglish = async (lookbook: Lookbook) => {
    setAiBusyId(`${lookbook.id}:en`);
    setMessage(null);
    try {
      const response = await fetch(`/api/lookbooks/${lookbook.id}/translate`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.lookbook) throw new Error(result.error || "영어판 생성에 실패했어요.");
      setLookbooks((current) => [result.lookbook, ...current]);
      setMessage({ text: "영어판 룩북이 만들어졌어요! 링크를 복사해 해외 크리에이터·바이어에게 보내보세요.", ok: true });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "영어판 생성에 실패했어요.", ok: false });
    } finally {
      setAiBusyId("");
    }
  };

  const remove = async (lookbook: Lookbook) => {
    if (!window.confirm(`'${lookbook.title}' 룩북을 삭제할까요? 공유한 링크도 더 이상 열리지 않아요.`)) return;
    setBusyId(lookbook.id);
    try {
      const response = await fetch(`/api/lookbooks/${lookbook.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "삭제에 실패했어요. 다시 시도해주세요.");
      }
      setLookbooks((current) => current.filter((entry) => entry.id !== lookbook.id));
      if (editingId === lookbook.id) resetEditor();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "삭제에 실패했어요.", ok: false });
    } finally {
      setBusyId("");
    }
  };

  const totalAssets = assets.looks.length + portfolioAssets.length + assets.products.length;

  return (
    <>
      <h1 className="st-title">룩북 만들기</h1>
      <p className="st-sub">승인된 룩·포트폴리오·상품을 골라 링크 하나로 보내는 웹 룩북을 만들어요.</p>

      {totalAssets === 0 ? (
        <div className="st-empty">
          <div className="ic"><NavIcon name="book" className="st-ico" /></div>
          <p>룩북에 넣을 수 있는 자산이 아직 없어요. 먼저 상품을 등록하거나 AI 룩을 만들어보세요.</p>
        </div>
      ) : (
        <section className="st-card lb-editor">
          <div className="lb-fields">
            <label>
              룩북 제목
              <input
                type="text"
                value={title}
                maxLength={60}
                placeholder="예: 2026 F/W 컬렉션"
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              무드 문구 <span className="opt">(선택)</span>
              <input
                type="text"
                value={tagline}
                maxLength={120}
                placeholder={`예: ${brandName} — Quiet Luxury Edit`}
                onChange={(event) => setTagline(event.target.value)}
              />
            </label>
          </div>

          <div className="lb-tabs" role="tablist" aria-label="자산 종류">
            {(Object.keys(TAB_LABEL) as Tab[]).map((tab) => {
              const count = tab === "look" ? assets.looks.length : tab === "portfolio" ? portfolioAssets.length : assets.products.length;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={activeTab === tab ? "is-active" : ""}
                  onClick={() => setActiveTab(tab)}
                >
                  {TAB_LABEL[tab]} <b>{count}</b>
                </button>
              );
            })}
            <button
              type="button"
              className="lb-upload-btn"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "올리는 중…" : "＋ 내 사진 올리기"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => uploadPhotos(event.target.files)}
            />
          </div>
          <p className="lb-upload-hint">컴퓨터·폰의 사진을 올리면 구성에 바로 담겨요. 올린 사진은 포트폴리오에도 저장됩니다.</p>

          {tabAssets.length ? (
            <div className="lb-asset-grid">
              {tabAssets.map(({ key, item, caption }) => {
                const order = selectedOrder[key];
                return (
                  <button
                    key={key}
                    type="button"
                    className={`lb-asset${order ? " is-selected" : ""}`}
                    onClick={() => toggleItem(item)}
                    aria-pressed={Boolean(order)}
                  >
                    <img src={item.imageUrl} alt={caption || "자산 이미지"} loading="lazy" />
                    {order ? <span className="lb-order">{order}</span> : null}
                    {caption ? <small>{caption}</small> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="lb-empty-tab">이 종류의 자산이 아직 없어요.</p>
          )}

          {items.length ? (
            <div className="lb-composition">
              <p className="lb-comp-head">
                페이지 미리보기 <b>{built.pages.length}페이지 · 사진 {items.length}장</b> — 페이지를 누르면 레이아웃과 사진을 바꿀 수 있어요
              </p>

              <div className="lbps" role="tablist" aria-label="룩북 페이지">
                {built.pages.map((page, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`lbps-pg${selectedPageIdx === index ? " is-active" : ""}`}
                    onClick={() => { setSelectedPageIdx(selectedPageIdx === index ? null : index); setPickSlotIdx(null); }}
                  >
                    <span className={`lbps-mini k-${page.kind}`}>
                      {page.kind === "intro" ? (
                        <i className="lbps-lines" aria-hidden="true" />
                      ) : page.kind === "back" ? (
                        <i className="lbps-qr" aria-hidden="true">QR</i>
                      ) : (
                        page.items.slice(0, 4).map((item, i) => <img key={i} src={item.imageUrl} alt="" />)
                      )}
                    </span>
                    <small>{index + 1}. {PAGE_LABEL[page.kind]}</small>
                  </button>
                ))}
              </div>

              {selectedPage ? (
                <div className="lbpe">
                  {isLookPage(selectedPage.kind) ? (
                    <>
                      <p className="lbpe-head">레이아웃 고르기</p>
                      <div className="lbpe-presets">
                        {(Object.keys(LAYOUT_LABEL) as LookbookLayout[]).map((kind) => {
                          const lookOrder = built.pages.slice(0, selectedPageIdx!).filter((page) => isLookPage(page.kind)).length;
                          return (
                            <button
                              key={kind}
                              type="button"
                              className={selectedPage.kind === kind ? "is-active" : ""}
                              onClick={() => changeLayout(lookOrder, kind)}
                            >
                              <span className={`lbpe-glyph g-${kind}`} aria-hidden="true">
                                {Array.from({ length: LAYOUT_COUNT[kind] }).map((_, i) => <i key={i} />)}
                              </span>
                              {LAYOUT_LABEL[kind]}
                            </button>
                          );
                        })}
                      </div>
                      <p className="lbpe-head">사진 바꾸기 — 자리를 누른 뒤, 아래 사진 목록에서 넣을 사진을 누르세요</p>
                      <div className="lbpe-slots">
                        {selectedPage.itemIndexes.map((globalIndex) => (
                          <div className={`lbpe-slot${pickSlotIdx === globalIndex ? " is-picking" : ""}`} key={globalIndex}>
                            <button type="button" className="pic" onClick={() => setPickSlotIdx(pickSlotIdx === globalIndex ? null : globalIndex)}>
                              <img src={items[globalIndex]?.imageUrl} alt="" />
                              {pickSlotIdx === globalIndex ? <span className="picking-tag">바꿀 자리</span> : null}
                            </button>
                            <button type="button" className="x" aria-label="이 사진 빼기" onClick={() => removeAt(globalIndex)}>✕</button>
                          </div>
                        ))}
                      </div>
                      {pickSlotIdx !== null ? (
                        <p className="lbpe-pick-hint">이제 위 사진 목록에서 사진을 누르면 이 자리에 들어가요. (같은 자리를 다시 누르면 취소)</p>
                      ) : null}
                    </>
                  ) : selectedPage.kind === "cover" ? (
                    <>
                      <p className="lbpe-head">표지 사진 — 누른 뒤 사진 목록에서 바꿀 사진을 고르세요</p>
                      <div className="lbpe-slots">
                        {built.coverItemIndex >= 0 ? (
                          <div className={`lbpe-slot${pickSlotIdx === built.coverItemIndex ? " is-picking" : ""}`}>
                            <button type="button" className="pic" onClick={() => setPickSlotIdx(pickSlotIdx === built.coverItemIndex ? null : built.coverItemIndex)}>
                              <img src={items[built.coverItemIndex]?.imageUrl} alt="" />
                              {pickSlotIdx === built.coverItemIndex ? <span className="picking-tag">바꿀 자리</span> : null}
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <p className="lbpe-note">표지에는 브랜드명·제목·무드 문구가 자동으로 얹혀요.</p>
                    </>
                  ) : (
                    <p className="lbpe-note">
                      {selectedPage.kind === "intro"
                        ? "브랜드 프로필의 소개문·무드로 자동으로 만들어지는 페이지예요. 브랜드 프로필에서 수정할 수 있어요."
                        : selectedPage.kind === "index"
                          ? "상품 사진들이 자동으로 정리되는 바이어용 페이지예요. 상품은 위 '상품' 탭에서 담고 빼면 돼요."
                          : "협업 제안 버튼과 QR코드가 자동으로 들어가는 마지막 페이지예요."}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="lb-save-row">
            <button className="st-btn" type="button" disabled={saving} onClick={save}>
              {saving ? "저장 중…" : editingId ? "수정 저장하기" : "룩북 게시하기"}
            </button>
            {editingId ? (
              <button className="st-btn light" type="button" onClick={resetEditor}>수정 취소</button>
            ) : null}
          </div>
          {message ? <p className={`lb-msg ${message.ok ? "ok" : "err"}`}>{message.text}</p> : null}
          {publishedSlug ? (
            <div className="lb-published">
              <span>공개 링크</span>
              <code>{typeof window !== "undefined" ? window.location.origin : ""}/lookbook/{publishedSlug}</code>
              <button type="button" onClick={() => copyLink(publishedSlug)}>링크 복사</button>
              <a href={`/lookbook/${publishedSlug}`} target="_blank" rel="noreferrer">새 탭에서 보기</a>
            </div>
          ) : null}
        </section>
      )}

      <div className="st-sec-head" style={{ marginTop: 30 }}>
        <h2>내 룩북 {lookbooks.length ? <span className="lb-count">{lookbooks.length}</span> : null}</h2>
      </div>
      {lookbooks.length ? (
        <div className="lb-list">
          {lookbooks.map((lookbook) => (
            <article className="st-card lb-row" key={lookbook.id}>
              <div className="lb-row-thumbs">
                {lookbook.items.slice(0, 3).map((item, index) => (
                  <img key={`${lookbook.id}-${index}`} src={item.imageUrl} alt="" loading="lazy" />
                ))}
              </div>
              <div className="lb-row-body">
                <strong>
                  {lookbook.title}
                  {lookbook.lang === "en" ? <em className="lb-lang">EN</em> : null}
                </strong>
                <p>{lookbook.items.length}장 · {formatDate(lookbook.created_at)}{lookbook.tagline ? ` · ${lookbook.tagline}` : ""}</p>
              </div>
              <div className="lb-row-actions">
                <button type="button" onClick={() => copyLink(lookbook.slug)}>링크 복사</button>
                <a href={`/lookbook/${lookbook.slug}`} target="_blank" rel="noreferrer">보기</a>
                <button
                  type="button"
                  className="ai"
                  disabled={aiBusyId === `${lookbook.id}:cap`}
                  onClick={() => runAiCaptions(lookbook)}
                >
                  {aiBusyId === `${lookbook.id}:cap` ? "생성 중…" : "AI 캡션"}
                </button>
                {lookbook.lang !== "en" ? (
                  <button
                    type="button"
                    className="ai"
                    disabled={aiBusyId === `${lookbook.id}:en`}
                    onClick={() => makeEnglish(lookbook)}
                  >
                    {aiBusyId === `${lookbook.id}:en` ? "번역 중…" : "영어판 만들기"}
                  </button>
                ) : null}
                <button type="button" onClick={() => startEdit(lookbook)}>수정</button>
                <button type="button" className="danger" disabled={busyId === lookbook.id} onClick={() => remove(lookbook)}>삭제</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="st-empty compact"><p>아직 만든 룩북이 없어요. 위에서 첫 룩북을 만들어보세요.</p></div>
      )}
    </>
  );
}
