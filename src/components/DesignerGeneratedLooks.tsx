"use client";

// 디자이너가 만든 AI 룩 목록 — 공개/비공개 전환 + 룩별 Veo 숏폼 영상 생성(1일 한도·안내창·진행 폴링)
import { useEffect, useRef, useState } from "react";
import NavIcon from "@/components/NavIcons";
import type { GeneratedLook } from "@/lib/types";

function getStatusLabel(status: GeneratedLook["status"]) {
  if (status === "approved") return "공개 중";
  if (status === "hidden") return "비공개";
  if (status === "rejected") return "반려";
  return "검수 대기";
}

// 공개 프로세스 3단계 표시: 상태별로 각 단계의 완료/진행/실패를 계산
function getFlowSteps(status: GeneratedLook["status"]) {
  return [
    { label: "공개 요청", state: status === "hidden" ? "next" : "done" },
    {
      label: "관리자 검수",
      state: status === "generated" ? "active" : status === "approved" ? "done" : status === "rejected" ? "fail" : "todo",
    },
    { label: "공개 페이지 노출", state: status === "approved" ? "done" : "todo" },
  ] as const;
}

export default function DesignerGeneratedLooks({ initialLooks, enabled = false }: { initialLooks: GeneratedLook[]; enabled?: boolean }) {
  const [looks, setLooks] = useState(initialLooks);
  const [activeLook, setActiveLook] = useState<GeneratedLook | null>(null);
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState<GeneratedLook | null>(null);
  const [comingSoon, setComingSoon] = useState(false);
  const [videoBusyId, setVideoBusyId] = useState("");
  const [videoError, setVideoError] = useState("");
  const pollingRef = useRef<Set<string>>(new Set());

  const applyVideo = (lookId: string, patch: Partial<GeneratedLook>) => {
    setLooks((current) => current.map((item) => (item.id === lookId ? { ...item, ...patch } : item)));
    setActiveLook((current) => (current && current.id === lookId ? { ...current, ...patch } : current));
  };

  // 진행 중인 룩 상태를 주기적으로 확인 (워커가 완료/실패하면 멈춘다). 창을 닫아도 워커는 계속 진행.
  const pollVideo = (lookId: string) => {
    if (pollingRef.current.has(lookId)) return;
    pollingRef.current.add(lookId);
    let tries = 0;
    const tick = async () => {
      tries += 1;
      try {
        const res = await fetch(`/api/generated-looks/${lookId}/generate-video`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          applyVideo(lookId, { video_status: data.videoStatus, video_url: data.videoUrl ?? null });
          if (data.videoStatus === "completed" || data.videoStatus === "failed" || data.videoStatus === "none") {
            pollingRef.current.delete(lookId);
            return;
          }
        }
      } catch {
        /* 일시적 오류는 무시하고 다음 폴링에서 재시도 */
      }
      if (tries >= 60) {
        pollingRef.current.delete(lookId); // 약 8분 후 폴링 중단 (워커는 끝나면 DB에 반영됨)
        return;
      }
      window.setTimeout(tick, 8000);
    };
    window.setTimeout(tick, 6000);
  };

  // 다시 들어왔을 때 이미 진행 중인 룩이 있으면 폴링 재개
  useEffect(() => {
    looks.forEach((look) => {
      if (look.video_status === "queued" || look.video_status === "processing") pollVideo(look.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 상태 변경 확인 창 (초보자 가이드 겸용) + 완료 토스트
  const [confirmAction, setConfirmAction] = useState<{ look: GeneratedLook; next: "generated" | "hidden" } | null>(null);
  const [toast, setToast] = useState<{ text: string; tone?: "success" | "warning" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!confirmAction) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmAction(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmAction]);

  const updateStatus = async (look: GeneratedLook, status: "generated" | "hidden") => {
    setSavingId(look.id);
    try {
      const response = await fetch(`/api/generated-looks/${look.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.generatedLook) {
        setToast({ text: result.error || "상태 변경에 실패했어요. 잠시 후 다시 시도해주세요.", tone: "warning" });
        return;
      }
      setLooks((current) => current.map((item) => (item.id === look.id ? result.generatedLook : item)));
      setActiveLook((current) => current && current.id === look.id ? result.generatedLook : current);
      setToast({
        text: status === "generated"
          ? "공개 요청 완료! 관리자 검수가 끝나면 자동으로 공개 페이지에 올라가요."
          : "비공개로 바꿨어요. 공개 페이지에서 내려가고, 언제든 다시 공개 요청할 수 있어요.",
        tone: "success",
      });
    } catch {
      setToast({ text: "네트워크 오류로 변경하지 못했어요. 다시 시도해주세요.", tone: "warning" });
    } finally {
      setSavingId("");
    }
  };

  const startVideo = async (look: GeneratedLook) => {
    setVideoError("");
    setVideoBusyId(look.id);
    try {
      const res = await fetch(`/api/generated-looks/${look.id}/generate-video`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVideoError(data.error || "영상 생성을 시작하지 못했어요. 다시 시도해주세요.");
        return;
      }
      applyVideo(look.id, { video_status: data.videoStatus || "queued" });
      setNotice(null);
      pollVideo(look.id);
    } catch {
      setVideoError("네트워크 오류로 시작하지 못했어요. 다시 시도해주세요.");
    } finally {
      setVideoBusyId("");
    }
  };

  const openNotice = (look: GeneratedLook) => {
    if (!enabled) {
      setComingSoon(true);
      return;
    }
    setVideoError("");
    setNotice(look);
  };

  // 룩의 영상 상태에 따라 카드 하단 버튼/문구를 그린다.
  const videoControl = (look: GeneratedLook, inModal = false) => {
    if (look.video_status === "completed" && look.video_url) {
      if (inModal) return <span className="look-video-done"><NavIcon name="check" className="st-ico" /> 숏폼 영상 완성! 위에서 재생돼요.</span>;
      return (
        <button type="button" className="look-video-btn done" onClick={() => setActiveLook(look)}>
          <NavIcon name="play" className="st-ico" />
          <span>숏폼 영상 보기</span>
        </button>
      );
    }
    if (look.video_status === "queued" || look.video_status === "processing") {
      return <span className="look-video-btn making"><NavIcon name="clock" className="st-ico" /> 영상 만드는 중… (1~3분)</span>;
    }
    const isRetry = enabled && look.video_status === "failed";
    return (
      <button type="button" className="look-video-btn" disabled={enabled && videoBusyId === look.id} onClick={() => openNotice(look)}>
        <NavIcon name={isRetry ? "refresh" : "video"} className="st-ico" />
        <span>{isRetry ? "숏폼 영상 다시 만들기" : "숏폼 영상 만들기"}</span>
      </button>
    );
  };

  if (!looks.length) return null;

  return (
    <>
      <div className="st-sec-head" style={{ marginTop: 32 }}>
        <h2>내가 만든 룩</h2>
      </div>
      <div className="look-card-grid">
        {looks.map((look) => (
          <article className="look-card" key={look.id}>
            <button type="button" className="look-card-image" onClick={() => setActiveLook(look)}>
              <img
                src={look.image_url}
                alt="생성된 AI 룩"
                width={600}
                height={800}
                loading="lazy"
                decoding="async"
              />
              <span className={`badge ${look.status === "hidden" || look.status === "rejected" ? "priv" : "pub"}`}>{getStatusLabel(look.status)}</span>
              {look.video_status === "completed" && look.video_url ? <span className="look-card-play"><NavIcon name="play" className="st-ico" /> 숏폼</span> : null}
            </button>
            <div className="look-card-body">
              <strong>{look.cache_hit ? "저장된 조합" : "AI 생성 조합"}</strong>
              <p>{look.selected_product_ids.length}개 상품 조합</p>
              <div className="row">
                <button type="button" onClick={() => setActiveLook(look)}>크게 보기</button>
                <button
                  type="button"
                  disabled={savingId === look.id}
                  onClick={() => setConfirmAction({ look, next: look.status === "hidden" ? "generated" : "hidden" })}
                >
                  {look.status === "hidden" ? "공개 요청" : "비공개"}
                </button>
              </div>
              {videoControl(look)}
            </div>
          </article>
        ))}
      </div>

      {activeLook ? (
        <div className="look-modal" role="dialog" aria-modal="true" aria-label="AI 룩 크게 보기">
          <button type="button" className="look-modal-backdrop" onClick={() => setActiveLook(null)} />
          <div className="look-modal-panel">
            <button type="button" className="look-modal-close" onClick={() => setActiveLook(null)}>닫기</button>
            {activeLook.video_status === "completed" && activeLook.video_url ? (
              <video className="look-modal-media" src={activeLook.video_url} controls autoPlay loop muted playsInline />
            ) : (
              <img
                src={activeLook.image_url}
                alt="생성된 AI 룩 크게 보기"
                width={600}
                height={800}
                loading="lazy"
                decoding="async"
              />
            )}
            <div className="look-modal-info">
              <em className={`look-status-chip ${activeLook.status}`}>{getStatusLabel(activeLook.status)}</em>
              <strong className="look-modal-title">
                {activeLook.status === "approved"
                  ? "공개 페이지에 노출 중이에요"
                  : activeLook.status === "generated"
                    ? "관리자 검수를 기다리고 있어요"
                    : activeLook.status === "rejected"
                      ? "이번 룩은 반려됐어요"
                      : "아직 나만 볼 수 있는 룩이에요"}
              </strong>

              <ol className="look-flow" aria-label="공개 진행 단계">
                {getFlowSteps(activeLook.status).map((step, index) => (
                  <li key={step.label} className={`is-${step.state}`}>
                    <span className="n">{step.state === "done" ? "✓" : step.state === "fail" ? "!" : index + 1}</span>
                    {step.label}
                    {step.state === "active" ? <small>진행 중</small> : null}
                    {step.state === "fail" ? <small>반려됨</small> : null}
                  </li>
                ))}
              </ol>

              <p>
                {activeLook.status === "approved"
                  ? "크리에이터가 보는 공개 페이지에 이 룩이 노출되고 있어요."
                  : activeLook.status === "generated"
                    ? "승인이 끝나면 자동으로 공개 페이지에 올라가요. 따로 하실 일은 없어요."
                    : activeLook.status === "rejected"
                      ? "관리자 검수에서 반려됐어요. 다른 상품 조합이나 프롬프트로 새 룩을 만들어 다시 요청해보세요."
                      : "공개 요청을 누르면 관리자 검수 후, 크리에이터가 보는 공개 페이지에 노출돼요."}
              </p>

              <div className="look-video-cta">{videoControl(activeLook, true)}</div>
              {videoError ? <p className="look-video-err">{videoError}</p> : null}

              <div className="row">
                {activeLook.status === "hidden" || activeLook.status === "rejected" ? (
                  <button type="button" className="primary" disabled={savingId === activeLook.id} onClick={() => updateStatus(activeLook, "generated")}>
                    {activeLook.status === "rejected" ? "다시 공개 요청하기" : "공개 요청하기"}
                  </button>
                ) : null}
                {activeLook.status === "generated" ? (
                  <button type="button" disabled={savingId === activeLook.id} onClick={() => updateStatus(activeLook, "hidden")}>
                    요청 취소 (비공개로)
                  </button>
                ) : null}
                {activeLook.status === "approved" ? (
                  <>
                    <a className="look-public-link" href={`/designers?open=${activeLook.designer_id}`} target="_blank" rel="noreferrer">
                      공개 페이지에서 보기
                    </a>
                    <button type="button" disabled={savingId === activeLook.id} onClick={() => updateStatus(activeLook, "hidden")}>
                      비공개로 전환
                    </button>
                  </>
                ) : null}
              </div>
              <p className="look-cache-hint">같은 상품 조합을 다시 선택하면 이 룩을 재사용해요.</p>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="look-modal" role="dialog" aria-modal="true" aria-label="숏폼 영상 생성 안내">
          <button type="button" className="look-modal-backdrop" onClick={() => setNotice(null)} />
          <div className="look-notice-panel">
            <h3><NavIcon name="video" className="st-ico" /> 숏폼 영상 만들기</h3>
            <p>선택한 룩으로 약 <b>8초 길이의 세로형(9:16) 숏폼 영상</b>을 AI가 실제로 만들어 드려요.</p>
            <ul className="look-notice-list">
              <li>생성에 보통 <b>1~3분</b> 정도 걸려요. 창을 닫아도 계속 진행돼요.</li>
              <li>숏폼 영상은 <b>하루 최대 4개</b>까지 만들 수 있어요.</li>
              <li>모델·옷은 그대로 두고 자연스러운 움직임만 더해져요.</li>
            </ul>
            {videoError ? <p className="look-notice-err">{videoError}</p> : null}
            <div className="look-notice-actions">
              <button type="button" className="ghost" onClick={() => setNotice(null)}>취소</button>
              <button type="button" className="primary" disabled={videoBusyId === notice.id} onClick={() => startVideo(notice)}>
                {videoBusyId === notice.id ? "시작하는 중…" : "영상 만들기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 공개/비공개 확인 창 — 무엇이 일어나는지 3단계로 안내 (초보자 가이드 겸용) */}
      {confirmAction ? (
        <div className="look-modal" role="alertdialog" aria-modal="true" aria-label="공개 상태 변경 확인">
          <button type="button" className="look-modal-backdrop" onClick={() => setConfirmAction(null)} />
          <div className="look-notice-panel">
            {confirmAction.next === "generated" ? (
              <>
                <h3>이 룩을 공개 요청할까요?</h3>
                <p>공개 요청하면 아래 순서로 진행돼요. 따로 하실 일은 없어요.</p>
                <ol className="look-flow" style={{ marginTop: 14 }}>
                  <li className="is-active"><span className="n">1</span>공개 요청<small>지금 이 단계</small></li>
                  <li><span className="n">2</span>관리자 검수<small>보통 하루 안</small></li>
                  <li><span className="n">3</span>공개 페이지 노출<small>크리에이터에게 보여요</small></li>
                </ol>
                <p style={{ marginTop: 12 }}>승인되면 크리에이터가 보는 공개 페이지에 자동으로 올라가요.</p>
              </>
            ) : (
              <>
                <h3>이 룩을 비공개로 바꿀까요?</h3>
                <p>
                  비공개로 바꾸면 <b>공개 페이지에서 내려가고 나만 볼 수 있어요.</b><br />
                  룩이 지워지는 게 아니라서, 언제든 다시 공개 요청할 수 있어요.
                </p>
              </>
            )}
            <div className="look-notice-actions">
              <button type="button" className="ghost" onClick={() => setConfirmAction(null)}>취소</button>
              <button
                type="button"
                className="primary"
                disabled={savingId === confirmAction.look.id}
                onClick={() => {
                  const { look, next } = confirmAction;
                  setConfirmAction(null);
                  updateStatus(look, next);
                }}
              >
                {confirmAction.next === "generated" ? "공개 요청하기" : "비공개로 바꾸기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 상태 변경 결과 토스트 */}
      {toast ? (
        <div className={`styling-toast ${toast.tone || ""}`} role="status" aria-live="polite">
          <span className="styling-toast-ic" aria-hidden="true">{toast.tone === "warning" ? "!" : "✓"}</span>
          {toast.text}
        </div>
      ) : null}

      {/* 오픈 예정 안내 (영상 생성 준비 전) */}
      {comingSoon ? (
        <div className="look-modal" role="dialog" aria-modal="true" aria-label="숏폼 오픈 안내">
          <button type="button" className="look-modal-backdrop" onClick={() => setComingSoon(false)} />
          <div className="look-notice-panel">
            <h3><NavIcon name="video" className="st-ico" /> 숏폼 영상, 곧 만나요!</h3>
            <p>숏폼 영상 생성 기능은 <b>7월 말 오픈 예정</b>이에요. 막바지 준비 중이라 조금만 기다려 주세요</p>
            <p style={{ marginTop: 10 }}>지금 만들어 둔 룩은 오픈하자마자 바로 영상으로 만들 수 있어요.</p>
            <div className="look-notice-actions">
              <button type="button" className="primary" onClick={() => setComingSoon(false)}>확인</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
