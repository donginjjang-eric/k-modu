"use client";

// 디자이너 숏폼 스튜디오 — 내 AI 룩을 실제 Veo로 9:16 숏폼 영상으로 만들고 모아보는 화면
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { GeneratedLook } from "@/lib/types";

type Props = {
  initialLooks: GeneratedLook[];
  usedToday: number;
  dailyLimit: number;
};

export default function ShortformStudio({ initialLooks, usedToday, dailyLimit }: Props) {
  const [looks, setLooks] = useState(initialLooks);
  const [used, setUsed] = useState(usedToday);
  const [notice, setNotice] = useState<GeneratedLook | null>(null);
  const [style, setStyle] = useState<"runway" | "street">("runway");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [activeReel, setActiveReel] = useState<GeneratedLook | null>(null);
  const pollingRef = useRef<Set<string>>(new Set());

  const reels = looks.filter((l) => l.video_status === "completed" && l.video_url);
  const inFlight = looks.filter((l) => l.video_status === "queued" || l.video_status === "processing");
  const inFlightIds = new Set(inFlight.map((l) => l.id));
  const reelIds = new Set(reels.map((l) => l.id));
  const candidates = looks.filter((l) => !reelIds.has(l.id) && !inFlightIds.has(l.id));
  const remaining = Math.max(0, dailyLimit - used);

  const applyVideo = (lookId: string, patch: Partial<GeneratedLook>) => {
    setLooks((current) => current.map((item) => (item.id === lookId ? { ...item, ...patch } : item)));
    setActiveReel((current) => (current && current.id === lookId ? { ...current, ...patch } : current));
  };

  // 진행 중인 룩 상태를 주기적으로 확인 (워커가 완료/실패하면 멈춤). 창을 닫아도 워커는 계속 진행.
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
          if (data.videoStatus === "failed") setUsed((n) => Math.max(0, n - 1));
          if (data.videoStatus === "completed" || data.videoStatus === "failed" || data.videoStatus === "none") {
            pollingRef.current.delete(lookId);
            return;
          }
        }
      } catch {
        /* 일시 오류는 무시하고 다음 폴링에서 재시도 */
      }
      if (tries >= 60) {
        pollingRef.current.delete(lookId);
        return;
      }
      window.setTimeout(tick, 8000);
    };
    window.setTimeout(tick, 6000);
  };

  useEffect(() => {
    looks.forEach((look) => {
      if (look.video_status === "queued" || look.video_status === "processing") pollVideo(look.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startVideo = async (look: GeneratedLook) => {
    setError("");
    setBusyId(look.id);
    try {
      const res = await fetch(`/api/generated-looks/${look.id}/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "영상 생성을 시작하지 못했어요. 다시 시도해주세요.");
        return;
      }
      applyVideo(look.id, { video_status: data.videoStatus || "queued" });
      setUsed((n) => n + 1);
      setNotice(null);
      pollVideo(look.id);
    } catch {
      setError("네트워크 오류로 시작하지 못했어요. 다시 시도해주세요.");
    } finally {
      setBusyId("");
    }
  };

  const openNotice = (look: GeneratedLook) => {
    setError("");
    setNotice(look);
  };

  // 아직 AI 룩이 하나도 없으면 먼저 룩을 만들도록 안내
  if (!looks.length) {
    return (
      <div className="st-empty">
        <div className="ic">🎬</div>
        <p>숏폼 영상은 내 AI 룩으로 만들어요. 먼저 AI 룩을 한 개 만들어 볼까요?</p>
        <Link className="st-btn" href="/dashboard/designer/generated-looks">✨ AI 룩 만들러 가기</Link>
      </div>
    );
  }

  return (
    <>
      {/* 사용량 + 만드는 법 안내 */}
      <section className="st-card sf-intro">
        <div className="sf-usage">
          <span className="sf-usage-num">{remaining}</span>
          <div className="sf-usage-copy">
            <strong>오늘 {remaining}개 더 만들 수 있어요</strong>
            <small>숏폼 영상은 하루 최대 {dailyLimit}개까지 (오늘 {used}/{dailyLimit} 사용)</small>
          </div>
        </div>
        <ol className="sf-steps">
          <li><span>1</span> 만들 AI 룩을 골라요</li>
          <li><span>2</span> AI가 1~3분간 영상을 생성해요</li>
          <li><span>3</span> 9:16 세로형 숏폼이 완성돼요</li>
        </ol>
      </section>

      {error ? <p className="sf-error">{error}</p> : null}

      {/* 진행 중 */}
      {inFlight.length ? (
        <>
          <div className="st-sec-head"><h2>만드는 중 <span className="sf-count">{inFlight.length}</span></h2></div>
          <div className="sf-reel-grid">
            {inFlight.map((look) => (
              <article className="sf-reel is-making" key={look.id}>
                <img src={look.image_url} alt="생성 중인 룩" />
                <div className="sf-reel-making"><span className="sf-spinner" /> 영상 만드는 중…<small>1~3분 · 창 닫아도 계속돼요</small></div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {/* 완성된 숏폼 */}
      <div className="st-sec-head" style={{ marginTop: 26 }}>
        <h2>완성된 숏폼 {reels.length ? <span className="sf-count">{reels.length}</span> : null}</h2>
      </div>
      {reels.length ? (
        <div className="sf-reel-grid">
          {reels.map((look) => (
            <article className="sf-reel" key={look.id}>
              <button type="button" className="sf-reel-play" onClick={() => setActiveReel(look)} aria-label="숏폼 영상 재생">
                <video src={look.video_url ?? undefined} muted loop playsInline preload="metadata" />
                <span className="sf-reel-badge">▶ 숏폼</span>
              </button>
              <div className="sf-reel-foot">
                <span>{look.selected_product_ids.length}개 상품 조합</span>
                <a href={look.video_url ?? "#"} download className="sf-reel-dl">다운로드</a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="st-empty compact">
          <p>아직 만든 숏폼이 없어요. 아래에서 AI 룩을 골라 첫 숏폼을 만들어 보세요.</p>
        </div>
      )}

      {/* AI 룩으로 만들기 */}
      {candidates.length ? (
        <>
          <div className="st-sec-head" style={{ marginTop: 26 }}>
            <h2>AI 룩으로 숏폼 만들기</h2>
            <Link href="/dashboard/designer/generated-looks">룩 더 만들기 →</Link>
          </div>
          <div className="sf-pick-grid">
            {candidates.map((look) => (
              <article className="sf-pick" key={look.id}>
                <div className="sf-pick-img"><img src={look.image_url} alt="AI 룩" />
                  {look.video_status === "failed" ? <span className="sf-pick-failed">실패 · 다시 시도</span> : null}
                </div>
                <button
                  type="button"
                  className="look-video-btn"
                  disabled={busyId === look.id || remaining <= 0}
                  onClick={() => openNotice(look)}
                >
                  {remaining <= 0 ? "오늘 한도 소진" : look.video_status === "failed" ? "↻ 다시 만들기" : "🎬 숏폼 만들기"}
                </button>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {/* 재생 모달 */}
      {activeReel && activeReel.video_url ? (
        <div className="look-modal" role="dialog" aria-modal="true" aria-label="숏폼 영상 재생">
          <button type="button" className="look-modal-backdrop" onClick={() => setActiveReel(null)} />
          <div className="sf-player-panel">
            <button type="button" className="look-modal-close" onClick={() => setActiveReel(null)}>닫기</button>
            <video src={activeReel.video_url} controls autoPlay loop playsInline />
            <a href={activeReel.video_url} download className="sf-player-dl">⬇ 영상 다운로드</a>
          </div>
        </div>
      ) : null}

      {/* 생성 안내창 */}
      {notice ? (
        <div className="look-modal" role="dialog" aria-modal="true" aria-label="숏폼 영상 생성 안내">
          <button type="button" className="look-modal-backdrop" onClick={() => setNotice(null)} />
          <div className="look-notice-panel">
            <h3>🎬 숏폼 영상 만들기</h3>
            <p>선택한 룩으로 약 <b>8초 길이의 세로형(9:16) 숏폼 영상</b>을 AI가 실제로 만들어 드려요.</p>
            <div className="sf-style-pick">
              <span className="sf-style-label">모션 스타일</span>
              <div className="sf-style-opts">
                <button type="button" className={style === "runway" ? "is-sel" : ""} onClick={() => setStyle("runway")}>
                  <b>🚶‍♀️ 모델 워킹</b><small>런웨이 캣워크로 착장을 또렷이</small>
                </button>
                <button type="button" className={style === "street" ? "is-sel" : ""} onClick={() => setStyle("street")}>
                  <b>🏙️ 스트리트 워킹</b><small>거리 무드로 자연스럽게</small>
                </button>
              </div>
            </div>
            <ul className="look-notice-list">
              <li>생성에 보통 <b>1~3분</b> 정도 걸려요. 창을 닫아도 계속 진행돼요.</li>
              <li>숏폼 영상은 <b>하루 최대 {dailyLimit}개</b>까지 (오늘 {remaining}개 남음).</li>
              <li>모델이 <b>걸으면서</b> 착장을 보여주도록 모션을 넣어요.</li>
            </ul>
            {error ? <p className="look-notice-err">{error}</p> : null}
            <div className="look-notice-actions">
              <button type="button" className="ghost" onClick={() => setNotice(null)}>취소</button>
              <button type="button" className="primary" disabled={busyId === notice.id} onClick={() => startVideo(notice)}>
                {busyId === notice.id ? "시작하는 중…" : "영상 만들기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
