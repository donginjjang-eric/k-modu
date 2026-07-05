"use client";

// 룩북 편집기: 사진 업로드/승인 자산 선택 → 순서 조정 → 게시(공개 링크 발급) + 내 룩북 목록 관리
import { useMemo, useRef, useState } from "react";
import NavIcon from "@/components/NavIcons";
import type { Lookbook, LookbookItem } from "@/lib/types";

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
}: {
  brandName: string;
  assets: Assets;
  initialLookbooks: Lookbook[];
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

  const toggleItem = (item: LookbookItem) => {
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

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const resetEditor = () => {
    setTitle("");
    setTagline("");
    setItems([]);
    setEditingId(null);
  };

  const startEdit = (lookbook: Lookbook) => {
    setEditingId(lookbook.id);
    setTitle(lookbook.title);
    setTagline(lookbook.tagline);
    setItems(lookbook.items);
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
        body: JSON.stringify({ title: title.trim(), tagline: tagline.trim(), items }),
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
              <p className="lb-comp-head">구성 <b>{items.length}장</b> — 순서대로 룩북에 실려요</p>
              <div className="lb-comp-list">
                {items.map((item, index) => (
                  <div className="lb-comp-item" key={itemKey(item)}>
                    <img src={item.imageUrl} alt="" />
                    <span className="lb-comp-no">{index + 1}</span>
                    <div className="lb-comp-actions">
                      <button type="button" aria-label="앞으로" disabled={index === 0} onClick={() => moveItem(index, -1)}>←</button>
                      <button type="button" aria-label="뒤로" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>→</button>
                      <button type="button" aria-label="빼기" onClick={() => toggleItem(item)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
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
                <strong>{lookbook.title}</strong>
                <p>{lookbook.items.length}장 · {formatDate(lookbook.created_at)}{lookbook.tagline ? ` · ${lookbook.tagline}` : ""}</p>
              </div>
              <div className="lb-row-actions">
                <button type="button" onClick={() => copyLink(lookbook.slug)}>링크 복사</button>
                <a href={`/lookbook/${lookbook.slug}`} target="_blank" rel="noreferrer">보기</a>
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
