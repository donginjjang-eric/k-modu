"use client";

// 브랜드 프로필 통합 화면: 왼쪽 편집(기본 정보·대표 사진·포트폴리오) ↔ 오른쪽 공개 카드 실시간 미리보기
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DesignerPortfolioImage } from "@/lib/types";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
// 아이폰 HEIC 포함. 빈 type은 서버 판별에 맡긴다.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const STATUS_LABEL: Record<DesignerPortfolioImage["status"], string> = {
  pending: "검토 중",
  approved: "공개 중",
  rejected: "반려됨",
  hidden: "비공개",
};

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  if (response.status === 413) return { ok: false, error: "이미지 용량이 너무 커요. 8MB 이하로 올려주세요." };
  return { ok: false, error: "로그인이 만료됐거나 서버 응답이 없어요. 새로고침 후 다시 시도해주세요." };
}

type Props = {
  designer: { id: string; brandName: string; designerName: string; description: string; mood: string };
  initialImages: DesignerPortfolioImage[];
  looksCount: number;
};

export default function BrandProfileStudio({ designer, initialImages, looksCount }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    brandName: designer.brandName,
    designerName: designer.designerName,
    description: designer.description,
    mood: designer.mood,
  });
  const [images, setImages] = useState(initialImages);
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [busyImageId, setBusyImageId] = useState("");
  const [pickCoverMode, setPickCoverMode] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const galleryFileRef = useRef<HTMLInputElement | null>(null);
  const coverFileRef = useRef<HTMLInputElement | null>(null);
  const toastTimer = useRef<number | null>(null);

  const say = (text: string, ok = true) => {
    setToast({ text, ok });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  };

  // 공개 규칙과 동일: profile 승인컷 → lookbook 승인컷 순으로 커버 결정
  const visibleImages = useMemo(() => images.filter((image) => image.status !== "hidden"), [images]);
  const cover = useMemo(() => (
    visibleImages.find((image) => image.kind === "profile" && image.status === "approved")
    || visibleImages.find((image) => image.status === "approved")
    || null
  ), [visibleImages]);
  const galleryImages = useMemo(
    () => visibleImages.filter((image) => image.id !== cover?.id),
    [visibleImages, cover],
  );
  const stripImages = useMemo(
    () => galleryImages.filter((image) => image.status === "approved").slice(0, 3),
    [galleryImages],
  );

  const checklist = [
    { done: Boolean(cover), label: "대표 사진 1장" },
    { done: form.description.trim().length > 0, label: "브랜드 소개 입력" },
    { done: galleryImages.filter((image) => image.status === "approved").length >= 3, label: "포트폴리오 3장 이상" },
    { done: looksCount >= 1, label: "AI 룩 1개 만들기", href: "/dashboard/designer/generated-looks" },
  ];
  const doneCount = checklist.filter((item) => item.done).length;

  const saveInfo = async () => {
    if (!form.brandName.trim()) {
      say("브랜드명을 입력해주세요.", false);
      return;
    }
    setSavingInfo(true);
    try {
      const response = await fetch("/api/designer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await readJsonResponse(response);
      if (!response.ok || result.ok === false) throw new Error(result.error || "저장에 실패했어요.");
      say("저장됐어요. 공개 카드에 바로 반영돼요.");
      router.refresh();
    } catch (error) {
      say(error instanceof Error ? error.message : "저장에 실패했어요.", false);
    } finally {
      setSavingInfo(false);
    }
  };

  const uploadOne = async (file: File, kind: "profile" | "lookbook") => {
    if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error(`${file.name}: JPG·PNG·WEBP·HEIC만 가능해요`);
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name}: 8MB를 넘어요`);
    const body = new FormData();
    body.append("image", file);
    const uploadRes = await fetch("/api/uploads/portfolio-image", { method: "POST", body });
    const uploadResult = await readJsonResponse(uploadRes);
    if (!uploadRes.ok || !uploadResult.imageUrl) throw new Error(uploadResult.error || `${file.name} 업로드 실패`);

    const registerRes = await fetch("/api/designer/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: uploadResult.imageUrl,
        imageHash: uploadResult.imageHash || null,
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 60),
        kind,
      }),
    });
    const registerResult = await readJsonResponse(registerRes);
    if (!registerRes.ok || !registerResult.image) throw new Error(registerResult.error || `${file.name} 등록 실패`);
    return registerResult.image as DesignerPortfolioImage;
  };

  // 기존 대표(profile)들을 일반(lookbook)으로 내림 — 커버는 항상 1장 유지
  const demoteOtherCovers = async (exceptId: string) => {
    const others = images.filter((image) => image.kind === "profile" && image.id !== exceptId);
    for (const other of others) {
      await fetch(`/api/designer/portfolio/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "lookbook" }),
      }).catch(() => {});
    }
    setImages((current) => current.map((image) => (
      image.kind === "profile" && image.id !== exceptId ? { ...image, kind: "lookbook" } : image
    )));
  };

  const uploadGallery = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    let added = 0;
    const failed: string[] = [];
    for (const file of Array.from(files).slice(0, 12)) {
      try {
        const image = await uploadOne(file, "lookbook");
        setImages((current) => [image, ...current]);
        added += 1;
      } catch (error) {
        failed.push(error instanceof Error ? error.message : file.name);
      }
    }
    setUploading(false);
    if (galleryFileRef.current) galleryFileRef.current.value = "";
    if (added && !failed.length) say(`사진 ${added}장이 올라갔어요 — 공개 카드에 바로 반영돼요.`);
    else if (added) say(`${added}장 완료 · 실패: ${failed.join(", ")}`, false);
    else say(`업로드 실패: ${failed.join(", ")}`, false);
  };

  const uploadCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const image = await uploadOne(file, "profile");
      setImages((current) => [image, ...current]);
      await demoteOtherCovers(image.id);
      say("대표 사진을 바꿨어요. 이전 대표 사진은 갤러리에 남아 있어요.");
    } catch (error) {
      say(error instanceof Error ? error.message : "대표 사진 교체에 실패했어요.", false);
    } finally {
      setCoverUploading(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  const makeCover = async (image: DesignerPortfolioImage) => {
    if (image.status === "rejected") {
      say("반려된 사진은 대표로 지정할 수 없어요. 다른 사진을 골라주세요.", false);
      return;
    }
    setBusyImageId(image.id);
    try {
      const response = await fetch(`/api/designer/portfolio/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "profile", status: "approved" }),
      });
      const result = await readJsonResponse(response);
      if (!response.ok || !result.image) throw new Error(result.error || "대표 지정에 실패했어요.");
      setImages((current) => current.map((entry) => (entry.id === image.id ? result.image : entry)));
      await demoteOtherCovers(image.id);
      say("대표 사진으로 지정했어요.");
    } catch (error) {
      say(error instanceof Error ? error.message : "대표 지정에 실패했어요.", false);
    } finally {
      setBusyImageId("");
      setPickCoverMode(false);
    }
  };

  const removeImage = async (image: DesignerPortfolioImage) => {
    if (!window.confirm("이 사진을 지울까요? 공개 화면에서도 내려가요.")) return;
    setBusyImageId(image.id);
    try {
      const response = await fetch(`/api/designer/portfolio/${image.id}`, { method: "DELETE" });
      const result = await readJsonResponse(response);
      if (!response.ok || result.ok === false) throw new Error(result.error || "삭제에 실패했어요.");
      setImages((current) => current.filter((entry) => entry.id !== image.id));
      say("사진을 지웠어요.");
    } catch (error) {
      say(error instanceof Error ? error.message : "삭제에 실패했어요.", false);
    } finally {
      setBusyImageId("");
    }
  };

  const previewCard = (
    <>
      <div className="bp-pcard">
        {cover ? (
          <div className="bp-pcard-cover" style={{ backgroundImage: `url('${cover.image_url}')` }} />
        ) : (
          <div className="bp-pcard-cover is-empty"><span>대표 사진을 올리면<br />여기에 보여요</span></div>
        )}
        <div className="bp-pcard-body">
          <p className="bp-kicker">DESIGNER PROFILE / PORTFOLIO</p>
          <h3>{form.brandName || "브랜드명"}</h3>
          {form.mood ? <p className="bp-mood">{form.mood}</p> : null}
          <p className="bp-desc">{form.description || "브랜드 소개를 입력하면 여기에 보여요."}</p>
          {form.designerName ? <p className="bp-designer">DESIGNER · {form.designerName}</p> : null}
        </div>
        {stripImages.length ? (
          <div className="bp-pcard-strip">
            {stripImages.map((image) => (
              <i key={image.id} style={{ backgroundImage: `url('${image.image_url}')` }} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="bp-check">
        <p>프로필 완성도 {doneCount} / {checklist.length}</p>
        <ul>
          {checklist.map((item) => (
            <li key={item.label} className={item.done ? "" : "todo"}>
              <b>{item.done ? "✓" : checklist.indexOf(item) + 1}</b>
              {item.href && !item.done ? <a href={item.href}>{item.label} →</a> : item.label}
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  return (
    <div className="bp">
      <div className="bp-head">
        <div>
          <h1 className="st-title">브랜드 프로필</h1>
          <p className="st-sub">여기서 입력한 내용이 공개 카드·룩북 인트로·영어판에 한 번에 쓰여요. 오른쪽이 크리에이터에게 보이는 실제 모습입니다.</p>
        </div>
      </div>

      {/* 모바일 전용 미리보기 접이식 */}
      <div className="bp-mobile-preview">
        <button type="button" onClick={() => setShowPreviewMobile((v) => !v)}>
          {showPreviewMobile ? "공개 카드 미리보기 접기 ▲" : "공개 카드 미리보기 펼치기 ▼"}
        </button>
        {showPreviewMobile ? <div className="bp-mobile-preview-body">{previewCard}</div> : null}
      </div>

      <div className="bp-layout">
        <div className="bp-edit">
          <section className="st-card bp-card">
            <h2><span className="bp-step">1</span>브랜드 기본 정보</h2>
            <p className="bp-sub">이 내용이 공개 카드 텍스트의 <b>원본</b>이 됩니다 (룩북 인트로에도 자동 사용)</p>
            <label>브랜드명</label>
            <input type="text" value={form.brandName} maxLength={60} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
            <label>디자이너명 <span className="opt">(공개 카드 DESIGNER 항목)</span></label>
            <input type="text" value={form.designerName} maxLength={60} placeholder="예: Han Seo Yoon" onChange={(e) => setForm({ ...form, designerName: e.target.value })} />
            <label>한 줄 무드</label>
            <input type="text" value={form.mood} maxLength={120} placeholder="예: Quiet Luxury · Seoul Minimal" onChange={(e) => setForm({ ...form, mood: e.target.value })} />
            <label>브랜드 소개</label>
            <textarea value={form.description} maxLength={600} rows={3} placeholder="브랜드를 소개하는 2~3문장" onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="bp-save-row">
              <button className="st-btn" type="button" disabled={savingInfo} onClick={saveInfo}>
                {savingInfo ? "저장 중…" : "저장하기"}
              </button>
            </div>
          </section>

          <section className="st-card bp-card">
            <h2><span className="bp-step">2</span>대표 사진 (카드 커버)</h2>
            <p className="bp-sub">공개 카드에서 가장 먼저 보이는 1장 · 3:4 세로 권장</p>
            <div className="bp-cover-row">
              {cover ? (
                <div className="bp-cover-slot" style={{ backgroundImage: `url('${cover.image_url}')` }}><em>대표</em></div>
              ) : (
                <div className="bp-cover-slot is-empty"><span>아직 없음</span></div>
              )}
              <div className="bp-cover-actions">
                <button type="button" className="dark" disabled={coverUploading} onClick={() => coverFileRef.current?.click()}>
                  {coverUploading ? "올리는 중…" : "사진 올려서 교체"}
                </button>
                <button
                  type="button"
                  className={pickCoverMode ? "is-picking" : ""}
                  onClick={() => setPickCoverMode((v) => !v)}
                >
                  {pickCoverMode ? "선택 취소" : "아래 갤러리에서 선택"}
                </button>
                <small>{pickCoverMode ? "아래 갤러리에서 사진을 누르면 대표가 돼요" : "교체해도 이전 사진은 갤러리에 남아요"}</small>
              </div>
            </div>
            <input ref={coverFileRef} type="file" accept="image/*" hidden onChange={(e) => uploadCover(e.target.files)} />
          </section>

          <section className="st-card bp-card">
            <h2><span className="bp-step">3</span>포트폴리오 사진</h2>
            <p className="bp-sub">올리면 <b>바로 공개 카드에 반영</b> — 종류 선택·등록 버튼 없이 끝. 룩북 만들기에서도 그대로 쓸 수 있어요</p>
            <button type="button" className="bp-drop" disabled={uploading} onClick={() => galleryFileRef.current?.click()}>
              <b>{uploading ? "올리는 중…" : "＋ 사진 올리기 (여러 장 가능)"}</b>
              <span>클릭해서 선택 · JPG·PNG·WEBP·아이폰(HEIC) · 8MB 이하</span>
            </button>
            <input ref={galleryFileRef} type="file" accept="image/*" multiple hidden onChange={(e) => uploadGallery(e.target.files)} />
            {galleryImages.length ? (
              <div className="bp-gallery">
                {galleryImages.map((image) => (
                  <div className={`bp-ph${pickCoverMode ? " pickable" : ""}`} key={image.id}>
                    <button
                      type="button"
                      className="bp-ph-img"
                      style={{ backgroundImage: `url('${image.image_url}')` }}
                      disabled={busyImageId === image.id}
                      onClick={() => (pickCoverMode ? makeCover(image) : undefined)}
                      aria-label={pickCoverMode ? "대표로 지정" : image.title || "포트폴리오 사진"}
                    />
                    <span className={`bp-st${image.status === "rejected" ? " rej" : ""}`}>{STATUS_LABEL[image.status]}</span>
                    <div className="bp-ph-acts">
                      <button type="button" disabled={busyImageId === image.id} onClick={() => makeCover(image)}>대표로</button>
                      <button type="button" disabled={busyImageId === image.id} onClick={() => removeImage(image)}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="bp-empty">아직 사진이 없어요. 위 버튼으로 화보·착장 사진을 올려보세요.</p>
            )}
            <p className="bp-hint">사진 위 [대표로]를 누르면 카드 커버가 돼요 · 반려된 사진은 공개 화면에 나오지 않아요</p>
          </section>
        </div>

        <aside className="bp-preview">
          <div className="bp-preview-head">
            <p>공개 카드 미리보기 — 입력하면 바로 바뀜</p>
            <a href={`/designers?open=${designer.id}`} target="_blank" rel="noreferrer">실제 화면 ↗</a>
          </div>
          {previewCard}
        </aside>
      </div>

      {toast ? (
        <div className={`styling-toast ${toast.ok ? "" : "warning"}`} role="status" aria-live="polite">
          <span className="styling-toast-ic" aria-hidden="true">{toast.ok ? "✓" : "!"}</span>
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}
