"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DesignerPortfolioImage, PortfolioImageKind } from "@/lib/types";

// 용어 사전: 스튜디오·미리보기·공개 화면이 같은 이름을 쓴다. destination은 공개 모달의 실제 섹션명(영문 그대로 노출됨).
// guide의 비율은 platform.css 실제 렌더링 기준 (커버·룩북 3:4, 제품·샘플 4:3).
const KINDS: Array<{ value: PortfolioImageKind; label: string; desc: string; guide: string; destination: string }> = [
  { value: "profile", label: "메인 커버", desc: "공개 카드에서 가장 먼저 보이는 대표 사진", guide: "1장 필수 · 3:4 세로", destination: "카드 커버 + 첫 화면" },
  { value: "lookbook", label: "룩북", desc: "브랜드 무드와 착장을 보여주는 화보", guide: "3~6장 권장 · 3:4 세로", destination: "Portfolio Preview" },
  { value: "product", label: "제품 컷", desc: "협찬 가능한 대표 상품 사진", guide: "2~4장 권장 · 4:3 가로", destination: "Hero Products" },
  { value: "sample", label: "샘플/소재", desc: "원단·디테일·샘플 근접 사진", guide: "자유 · 4:3 가로", destination: "Available Samples" },
];

const STATUS_LABELS: Record<DesignerPortfolioImage["status"], string> = {
  pending: "등록됨",
  approved: "공개 중",
  rejected: "반려",
  hidden: "비공개",
};

const KIND_LABELS = Object.fromEntries(KINDS.map((kind) => [kind.value, kind.label])) as Record<PortfolioImageKind, string>;
// 온보딩 목표치: KINDS guide의 권장 장수와 일치 (총 7장 = 완성도 100%)
const KIND_GOALS: Record<PortfolioImageKind, number> = { profile: 1, lookbook: 3, product: 2, sample: 1 };
const GOAL_TOTAL = Object.values(KIND_GOALS).reduce((sum, goal) => sum + goal, 0);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();

  const text = await response.text().catch(() => "");
  if (response.status === 413) {
    return { ok: false, error: "이미지 용량이 너무 큽니다. 8MB 이하의 JPG, PNG, WEBP로 올려주세요." };
  }
  if (response.status === 401 || response.redirected || text.includes("<!DOCTYPE")) {
    return { ok: false, error: "로그인이 만료되었거나 업로드 요청이 차단되었습니다. 새로고침 후 다시 로그인해주세요." };
  }
  return { ok: false, error: `업로드 서버가 정상 응답을 주지 않았습니다. (${response.status})` };
}

export default function PortfolioManager({ initialImages, approved }: { initialImages: DesignerPortfolioImage[]; approved: boolean }) {
  const [images, setImages] = useState(initialImages);
  const [activeKind, setActiveKind] = useState<PortfolioImageKind | "all">("all");
  const [title, setTitle] = useState("");
  // 메인 커버가 아직 없으면 커버부터 올리도록 유도
  const [kind, setKind] = useState<PortfolioImageKind>(() =>
    initialImages.some((image) => image.kind === "profile") ? "lookbook" : "profile"
  );
  // 업로드만 되고 아직 등록 전인 사진들 (여러 장 한번에 선택 가능)
  const [pendingImages, setPendingImages] = useState<Array<{ url: string; hash: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const uploadFiles = async (files: File[]) => {
    const valid: File[] = [];
    const skipped: string[] = [];
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        skipped.push(`${file.name} (JPG·PNG·WEBP만 가능)`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        skipped.push(`${file.name} (8MB 초과)`);
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) {
      setMsg({ text: `업로드할 수 없는 파일이에요: ${skipped.join(", ")}`, ok: false });
      return;
    }

    setUploading(true);
    setMsg(null);
    const uploaded: Array<{ url: string; hash: string }> = [];
    for (const file of valid) {
      try {
        const body = new FormData();
        body.append("image", file);
        const response = await fetch("/api/uploads/portfolio-image", { method: "POST", body });
        const result = await readJsonResponse(response);
        if (!response.ok) throw new Error(result.error || "이미지 업로드에 실패했습니다.");
        uploaded.push({ url: result.imageUrl, hash: result.imageHash });
      } catch (error) {
        skipped.push(`${file.name} (${error instanceof Error ? error.message : "업로드 실패"})`);
      }
    }
    setUploading(false);
    if (uploaded.length) setPendingImages((current) => [...current, ...uploaded]);

    if (skipped.length) {
      setMsg({ text: `${uploaded.length}장 선택 완료. 제외된 파일: ${skipped.join(", ")}`, ok: uploaded.length > 0 });
    } else {
      setMsg({ text: `사진 ${uploaded.length}장이 선택됐어요. 아래 [${KIND_LABELS[kind]} 등록하기]를 누르면 공개 화면에 반영돼요.`, ok: true });
    }
    if (uploaded.length) submitRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingImages.length) return;
    setSaving(true);
    setMsg(null);

    // 순서대로 등록하다 실패하면 거기서 멈추고, 성공분만 대기 목록에서 제거
    const registered: DesignerPortfolioImage[] = [];
    let failureText: string | null = null;
    for (const pending of pendingImages) {
      try {
        const response = await fetch("/api/designer/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, kind, imageUrl: pending.url, imageHash: pending.hash }),
        });
        const result = await readJsonResponse(response);
        if (!response.ok) throw new Error(result.error || "포트폴리오 저장에 실패했습니다.");
        registered.push(result.image);
      } catch (error) {
        failureText = error instanceof Error ? error.message : "포트폴리오 저장에 실패했습니다.";
        break;
      }
    }

    if (registered.length) {
      setImages((current) => [...registered, ...current]);
      setPendingImages((current) => current.slice(registered.length));
      setTitle("");
      // 페이지 상단 미리보기 카드(서버 렌더)도 같이 갱신
      router.refresh();
    }
    setMsg(
      failureText
        ? { text: `${registered.length}장 등록 후 중단됐어요: ${failureText}`, ok: false }
        : {
            text: approved
              ? `${registered.length}장 등록 완료! 공개 페이지 브랜드 카드에 바로 반영됐어요.`
              : `${registered.length}장 등록 완료! 프로필이 공개 승인되면 함께 공개돼요.`,
            ok: true,
          }
    );
    setSaving(false);
  };

  // 비공개/재공개 토글 — 목록에서 제거하지 않고 상태만 바꾼다
  const setImageVisibility = async (image: DesignerPortfolioImage, status: "hidden" | "approved") => {
    if (status === "hidden" && !window.confirm("이 사진을 비공개로 전환할까요? 공개 페이지에서 바로 내려가요.")) return;
    const response = status === "hidden"
      ? await fetch(`/api/designer/portfolio/${image.id}`, { method: "DELETE" })
      : await fetch(`/api/designer/portfolio/${image.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
    const result = await readJsonResponse(response);
    if (response.ok && result.image) {
      setImages((current) => current.map((item) => (item.id === result.image.id ? result.image : item)));
      router.refresh();
    } else {
      setMsg({ text: result.error || "상태 변경에 실패했어요.", ok: false });
    }
  };

  const onFiles = (files: FileList | null) => {
    if (files?.length) uploadFiles(Array.from(files));
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
      rejected: 0,
    };
    images.forEach((image) => {
      base[image.kind] += 1;
      if (image.status === "approved") base.approved += 1;
      if (image.status === "rejected") base.rejected += 1;
    });
    return base;
  }, [images]);

  const tabs: Array<{ value: PortfolioImageKind | "all"; label: string; count: number }> = [
    { value: "all", label: "전체", count: counts.all },
    ...KINDS.map((item) => ({ value: item.value, label: item.label, count: counts[item.value] })),
  ];

  const kindInfo = KINDS.find((item) => item.value === kind) ?? KINDS[0];
  // 완성도는 실제 공개 중(approved)인 사진 기준 — 비공개 사진은 진행률에서 제외
  const approvedByKind = useMemo(() => {
    const base: Record<PortfolioImageKind, number> = { profile: 0, lookbook: 0, product: 0, sample: 0 };
    images.forEach((image) => {
      if (image.status === "approved") base[image.kind] += 1;
    });
    return base;
  }, [images]);
  const achieved = KINDS.reduce((sum, item) => sum + Math.min(approvedByKind[item.value], KIND_GOALS[item.value]), 0);
  const percent = Math.round((achieved / GOAL_TOTAL) * 100);

  return (
    <section className="portfolio-section">
      <div className="st-sec-head portfolio-head">
        <div>
          <h2>브랜드 사진 관리</h2>
          <p className="st-sub tight">크리에이터가 브랜드를 판단할 수 있도록 메인 커버, 룩북, 제품 컷, 샘플 사진을 정리해주세요.</p>
        </div>
        <div className="portfolio-status">
          <div className="portfolio-progress" aria-label="프로필 완성도">
            <strong>프로필 완성도 {percent}%</strong>
            <div className="portfolio-progress-bar"><i style={{ width: `${percent}%` }} /></div>
            <p>{KINDS.map((item) => `${item.label} ${Math.min(approvedByKind[item.value], KIND_GOALS[item.value])}/${KIND_GOALS[item.value]}`).join(" · ")}</p>
          </div>
          <div className="portfolio-summary" aria-label="포트폴리오 상태 요약">
            <span><b>{counts.all}</b> 전체</span>
            <span><b>{counts.approved}</b> 공개 중</span>
            <span><b>{counts.rejected}</b> 제외됨</span>
          </div>
        </div>
      </div>

      <div className="portfolio-layout">
        <form className="st-card portfolio-upload-card" onSubmit={submit}>
          <div className="portfolio-card-head">
            <div>
              <div className="st-step"><span className="num">1</span> 사진 분류 선택</div>
              <p>어떤 사진인지 먼저 고르면 다른 위치에 잘못 올라가는 일이 없어요.</p>
            </div>
          </div>
          <div className="portfolio-kind-picker" role="radiogroup" aria-label="이미지 용도">
            {KINDS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={kind === item.value ? "is-active" : ""}
                onClick={() => setKind(item.value)}
                aria-pressed={kind === item.value}
              >
                <strong>{item.label} <span>{counts[item.value]}장</span></strong>
                <span className="desc">{item.desc}</span>
                <em className="dest">{item.guide} · {item.destination}</em>
              </button>
            ))}
          </div>

          <div className="st-step" style={{ marginTop: 24 }}><span className="num">2</span> 사진 업로드</div>
          <div
            className={`st-dz${drag ? " drag" : ""}${pendingImages.length ? " has-file" : ""}`}
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
            <span className="dz-kind">현재 분류: <b>{kindInfo.label}</b> · {kindInfo.guide}</span>
            <div className="ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.6" cy="8.8" r="1.9" />
                <path d="m3 17.2 5.2-5.2 4.1 4.1 2.8-2.8L21 19" />
              </svg>
            </div>
            <div className="big">{uploading ? "업로드 중..." : pendingImages.length ? `사진 ${pendingImages.length}장이 선택되었습니다` : "사진을 클릭하거나 끌어와서 업로드"}</div>
            <div className="small">{pendingImages.length ? "사진을 더 추가하거나, 아래에서 등록을 완료하세요" : "JPG·PNG·WEBP, 8MB 이하 · 여러 장 한번에 선택 가능"}</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(event) => {
                onFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          {pendingImages.length ? (
            <div className="portfolio-pending-grid">
              {pendingImages.map((item) => (
                <div className="portfolio-preview" key={item.url} style={{ backgroundImage: `url('${item.url}')` }}>
                  <span className="pending-chip">등록 대기</span>
                  <button type="button" onClick={() => setPendingImages((current) => current.filter((p) => p.url !== item.url))}>X</button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="st-step" style={{ marginTop: 24 }}><span className="num">3</span> 제목 (선택)</div>
          <div className="st-field">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 2026 SS 대표 룩" />
            <p className="hint">등록 즉시 선택한 분류 위치에 공개돼요. 제목은 비워도 괜찮아요.</p>
          </div>
          <button ref={submitRef} className="st-btn block" type="submit" disabled={!pendingImages.length || saving}>
            {saving
              ? "저장 중..."
              : pendingImages.length
                ? `${kindInfo.label} ${pendingImages.length}장 등록하기`
                : "사진을 선택하면 등록할 수 있어요"}
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
                    {image.title ? <div className="n">{image.title}</div> : null}
                    <div className="row">
                      {image.status === "hidden" ? (
                        <button type="button" onClick={() => setImageVisibility(image, "approved")}>다시 공개</button>
                      ) : (
                        <button type="button" onClick={() => setImageVisibility(image, "hidden")}>비공개로 전환</button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="st-empty compact"><p>아직 등록된 사진이 없어요. 사진을 업로드하면 이곳에 정리돼요.</p></div>
          )}
        </div>
      </div>
    </section>
  );
}
