"use client";

import { useMemo, useRef, useState } from "react";
import type { DesignerPortfolioImage, PortfolioImageKind } from "@/lib/types";

const KINDS: Array<{ value: PortfolioImageKind; label: string }> = [
  { value: "profile", label: "프로필" },
  { value: "lookbook", label: "포트폴리오" },
  { value: "product", label: "제품 컷" },
  { value: "sample", label: "샘플/소재" },
];

const STATUS_LABELS: Record<DesignerPortfolioImage["status"], string> = {
  pending: "검수 대기",
  approved: "승인",
  rejected: "반려",
  hidden: "숨김",
};

const KIND_LABELS = Object.fromEntries(KINDS.map((kind) => [kind.value, kind.label])) as Record<PortfolioImageKind, string>;

export default function PortfolioManager({ initialImages }: { initialImages: DesignerPortfolioImage[] }) {
  const [images, setImages] = useState(initialImages);
  const [activeKind, setActiveKind] = useState<PortfolioImageKind | "all">("all");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<PortfolioImageKind>("lookbook");
  const [imageUrl, setImageUrl] = useState("");
  const [imageHash, setImageHash] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setMsg(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch("/api/uploads/portfolio-image", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "이미지 업로드에 실패했습니다.");
      setImageUrl(result.imageUrl);
      setImageHash(result.imageHash);
      setMsg({ text: "이미지가 업로드되었습니다. 저장하면 관리자 검수 대기로 등록됩니다.", ok: true });
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.", ok: false });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const response = await fetch("/api/designer/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, kind, imageUrl, imageHash }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "포트폴리오 저장에 실패했습니다.");
      setImages((current) => [result.image, ...current]);
      setTitle("");
      setKind("lookbook");
      setImageUrl("");
      setImageHash("");
      setMsg({ text: "포트폴리오 이미지가 검수 대기로 등록되었습니다.", ok: true });
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "포트폴리오 저장에 실패했습니다.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const hideImage = async (image: DesignerPortfolioImage) => {
    if (!window.confirm("이 이미지를 숨길까요?")) return;
    const response = await fetch(`/api/designer/portfolio/${image.id}`, { method: "DELETE" });
    if (response.ok) setImages((current) => current.filter((item) => item.id !== image.id));
  };

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) upload(file);
  };

  const visibleImages = useMemo(() => (
    activeKind === "all" ? images : images.filter((image) => image.kind === activeKind)
  ), [activeKind, images]);

  const counts = useMemo(() => {
    const base = {
      all: images.length,
      profile: 0,
      lookbook: 0,
      product: 0,
      sample: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
    };
    images.forEach((image) => {
      base[image.kind] += 1;
      if (image.status === "approved") base.approved += 1;
      if (image.status === "pending") base.pending += 1;
      if (image.status === "rejected") base.rejected += 1;
    });
    return base;
  }, [images]);

  const tabs: Array<{ value: PortfolioImageKind | "all"; label: string; count: number }> = [
    { value: "all", label: "전체", count: counts.all },
    ...KINDS.map((item) => ({ value: item.value, label: item.label, count: counts[item.value] })),
  ];

  return (
    <section className="portfolio-section">
      <div className="st-sec-head portfolio-head">
        <div>
          <h2>프로필 / 포트폴리오 사진</h2>
          <p className="st-sub tight">브랜드 공개 페이지와 매칭 자료에 사용할 대표 사진을 올립니다.</p>
        </div>
        <div className="portfolio-summary" aria-label="포트폴리오 상태 요약">
          <span><b>{counts.all}</b> 전체</span>
          <span><b>{counts.approved}</b> 승인</span>
          <span><b>{counts.pending}</b> 검수 대기</span>
        </div>
      </div>

      <div className="portfolio-layout">
        <form className="st-card portfolio-upload-card" onSubmit={submit}>
          <div className="portfolio-card-head">
            <div>
              <div className="st-step"><span className="num">1</span> 이미지 업로드</div>
              <p>대표 프로필, 룩북, 제품 컷, 소재 샘플을 분류해서 저장합니다.</p>
            </div>
          </div>
          <div
            className={`st-dz${drag ? " drag" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDrag(false);
              onFiles(event.dataTransfer.files);
            }}
          >
            <div className="ic">IMG</div>
            <div className="big">{uploading ? "업로드 중..." : "사진을 선택하거나 끌어오세요"}</div>
            <div className="small">프로필, 룩북, 제품 컷, 소재 샘플 이미지를 등록할 수 있습니다.</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => onFiles(event.target.files)}
            />
          </div>

          {imageUrl ? (
            <div className="portfolio-preview" style={{ backgroundImage: `url('${imageUrl}')` }}>
              <button type="button" onClick={() => { setImageUrl(""); setImageHash(""); }}>X</button>
            </div>
          ) : null}

          <div className="st-step" style={{ marginTop: 24 }}><span className="num">2</span> 분류</div>
          <div className="portfolio-kind-picker" role="radiogroup" aria-label="이미지 용도">
            {KINDS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={kind === item.value ? "is-active" : ""}
                onClick={() => setKind(item.value)}
                aria-pressed={kind === item.value}
              >
                <strong>{item.label}</strong>
                <span>{counts[item.value]}장</span>
              </button>
            ))}
          </div>
          <div className="st-field">
            <label>이미지 제목</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 2026 SS 대표 룩" />
            <p className="hint">저장 후 관리자 승인 전까지는 공개 페이지에 노출하지 않습니다.</p>
          </div>
          <button className="st-btn block" type="submit" disabled={!imageUrl || saving}>
            {saving ? "저장 중..." : "검수 요청하기"}
          </button>
          {msg ? <p className={`st-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p> : null}
        </form>

        <div className="portfolio-library">
          <div className="portfolio-library-top">
            <div>
              <h2>등록한 사진</h2>
              <p>{activeKind === "all" ? "전체 사진" : KIND_LABELS[activeKind]} {visibleImages.length}장</p>
            </div>
            <div className="portfolio-filter-tabs" aria-label="포트폴리오 분류 필터">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={activeKind === tab.value ? "is-active" : ""}
                  onClick={() => setActiveKind(tab.value)}
                >
                  {tab.label}
                  <span>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
          {visibleImages.length ? (
            <div className="portfolio-grid">
              {visibleImages.map((image) => (
                <article className="st-pcard" key={image.id}>
                  <div className="img" style={{ backgroundImage: `url('${image.image_url}')` }}>
                    <span className={`badge ${image.status === "approved" ? "pub" : "priv"}`}>{STATUS_LABELS[image.status]}</span>
                  </div>
                  <div className="b">
                    <div className="c">{KIND_LABELS[image.kind]}</div>
                    <div className="n">{image.title || "제목 없음"}</div>
                    <div className="row">
                      <button type="button" onClick={() => hideImage(image)}>숨김</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="st-empty compact"><p>이 분류에 등록된 사진이 없습니다.</p></div>
          )}
        </div>
      </div>
    </section>
  );
}
