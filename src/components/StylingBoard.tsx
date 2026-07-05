"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DraggableTabs from "./DraggableTabs";
import { STYLING_PRODUCT_CATEGORY_LIMITS, groupStylingProductCategory } from "@/lib/product-selection-rules";

// 페이지를 벗어나도 생성을 이어 확인할 수 있게 진행 중 생성 키를 탭 세션에 기억
const PENDING_TRYON_KEY = "kmodu-tryon-pending";
// 보통 1~3분 걸리므로 진행 바는 150초 기준으로 차오르게 하고 93%에서 완료를 기다린다
const TYPICAL_SECONDS = 150;

type Designer = {
  brandName: string;
  mood: string;
  heroImage: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  status: string;
  image: string;
};

type ModelTemplate = {
  id: string;
  label: string;
  image: string;
};

export default function StylingBoard({
  designer,
  products,
  modelTemplates,
}: {
  designer: Designer;
  products: Product[];
  modelTemplates: ModelTemplate[];
}) {
  const minAiProducts = 1;
  // 테스트용 제한 해제: 총합 상한 사실상 없음 (카테고리 제한도 STYLING_PRODUCT_CATEGORY_LIMITS=999로 해제)
  const maxAiProducts = 999;
  const visibleModelTemplates = useMemo(
    () => modelTemplates.filter((template) => !`${template.id} ${template.label}`.toLowerCase().includes("male")),
    [modelTemplates],
  );
  const displayModelTemplates = useMemo(
    () => visibleModelTemplates.map((template, index) => (
      { ...template, label: index === 0 ? "기본 모델" : template.label, image: designer.heroImage }
    )),
    [designer.heroImage, visibleModelTemplates],
  );
  const [selectedTemplate, setSelectedTemplate] = useState(visibleModelTemplates[0]?.id || "");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("상의");
  const [previewImage, setPreviewImage] = useState(designer.heroImage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState("상품 1~4개를 선택하면 AI 룩을 생성할 수 있습니다.");
  const [resultLabel, setResultLabel] = useState("");
  // 디자이너가 입력하는 스타일링 프롬프트 (비우면 브랜드 무드 기본값)
  const [prompt, setPrompt] = useState("");
  // 모달은 결과(완료·실패)처럼 주의가 필요한 순간에만. imageUrl은 완료 썸네일, retry는 다시 시도 버튼 노출.
  const [modal, setModal] = useState<{ title: string; message: string; tone?: "success" | "warning" | "error"; imageUrl?: string; retry?: boolean } | null>(null);
  // 흐름을 막지 않는 안내(시작·선택 경고·초기화)는 자동으로 사라지는 토스트로
  const [toast, setToast] = useState<{ text: string; tone?: "success" | "warning" } | null>(null);

  // 토스트 3.2초 후 자동 닫힘
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // ESC로 모달 닫기
  useEffect(() => {
    if (!modal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);
  // 생성 대기 UX: 경과 시간(초) 카운트 + 완료 시 원래 탭 제목 복원용
  const [elapsed, setElapsed] = useState(0);
  const titleRef = useRef("");

  // 생성 중에만 1초 간격으로 경과 시간 증가 (진행 바·경과 표시)
  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const formatElapsed = (s: number) => (s < 60 ? `${s}초` : `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, "0")}초`);
  const progressPct = Math.min(93, Math.round((elapsed / TYPICAL_SECONDS) * 100));

  // 생성 시작 시: 경과 초기화 + 탭 제목 변경 + 완료 알림 권한 요청(한 번만)
  const beginWaitUx = () => {
    setElapsed(0);
    titleRef.current = document.title;
    document.title = "⏳ AI 룩 생성 중 — K-MODU";
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch { /* 알림 미지원 브라우저는 무시 */ }
  };

  // 완료 차임: 파일 없이 브라우저 오디오로 짧은 딩동
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      [[660, 0], [880, 0.18]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.55);
      });
    } catch { /* 소리 재생이 막혀 있어도 기능에는 지장 없음 */ }
  };

  // 완료 처리(직접 생성·이어보기 공용): 결과 표시 + 소리·탭 제목·브라우저 알림
  const finishSuccess = (finalResult: { imageUrl: string; cacheHit?: boolean }) => {
    try { sessionStorage.removeItem(PENDING_TRYON_KEY); } catch { /* 무시 */ }
    setPreviewImage(finalResult.imageUrl);
    setResultLabel(finalResult.cacheHit ? "저장된 룩" : "새 AI 룩");
    const doneMessage = finalResult.cacheHit
      ? "같은 조합으로 만들어 둔 룩이 있어 바로 불러왔어요."
      : "왼쪽 미리보기에서 확인하고, '내가 만든 룩'에 자동 저장됐어요.";
    setStatusText(doneMessage);
    setModal({
      title: finalResult.cacheHit ? "저장된 AI 룩을 불러왔어요" : "AI 룩이 완성됐어요",
      message: doneMessage,
      tone: "success",
      imageUrl: finalResult.imageUrl,
    });
    document.title = "✅ AI 룩 완성 — K-MODU";
    window.setTimeout(() => { document.title = titleRef.current || "K-MODU"; }, 10000);
    playChime();
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
        new Notification("AI 룩이 완성됐어요!", { body: "탭을 열어 결과를 확인해보세요." });
      }
    } catch { /* 알림 실패는 무시 */ }
  };

  const groupProductCategory = groupStylingProductCategory;

  const categories = Object.keys(STYLING_PRODUCT_CATEGORY_LIMITS);

  const visibleProducts = useMemo(
    () => products.filter((product) => groupProductCategory(product.category) === activeCategory),
    [activeCategory, products],
  );

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  );

  const selectedCategoryCounts = useMemo(() => (
    selectedProducts.reduce<Record<string, number>>((counts, product) => {
      const category = groupProductCategory(product.category);
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {})
  ), [groupProductCategory, selectedProducts]);

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId);
      const product = products.find((item) => item.id === productId);
      const productCategory = groupProductCategory(product?.category || "");
      const categoryLimit = STYLING_PRODUCT_CATEGORY_LIMITS[productCategory];
      const selectedInCategory = current.filter((id) => {
        const selectedProduct = products.find((item) => item.id === id);
        return groupProductCategory(selectedProduct?.category || "") === productCategory;
      }).length;
      if (selectedInCategory >= categoryLimit) {
        const message = `${productCategory}는 최대 ${categoryLimit}개까지 선택할 수 있어요. 먼저 선택된 ${productCategory}를 해제해주세요.`;
        setStatusText(message);
        setToast({ text: message, tone: "warning" });
        return current;
      }
      if (current.length >= maxAiProducts) {
        const message = "상품은 최대 4개까지 조합할 수 있어요. 선택된 상품을 해제하거나 초기화해주세요.";
        setStatusText(message);
        setToast({ text: message, tone: "warning" });
        return current;
      }
      return [...current, productId];
    });
  };

  const clearSelection = () => {
    setSelectedProductIds([]);
    setPreviewImage(designer.heroImage);
    setResultLabel("");
    const message = "선택을 초기화했어요. 상품을 다시 골라주세요.";
    setStatusText(message);
    setToast({ text: message, tone: "success" });
  };

  const pollGeneratedLook = async (cacheKey: string) => {
    for (let attempt = 0; attempt < 48; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const response = await fetch(`/api/generate-tryon?cacheKey=${encodeURIComponent(cacheKey)}`);
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json") ? await response.json() : null;

      if (!response.ok) {
        throw new Error(result?.error || `AI 생성 상태 확인 오류 (${response.status}).`);
      }
      if (result?.status === "completed" && result.imageUrl) return result;

      setStatusText("AI 룩 생성 중 — 완료되면 자동으로 표시돼요. 다른 탭을 보고 계셔도 소리와 알림으로 알려드려요.");
    }

    throw new Error("AI 생성이 오래 걸리고 있습니다. 잠시 후 내가 만든 룩 목록을 새로고침해 확인해주세요.");
  };

  // 생성 도중 페이지를 떠났다가 돌아온 경우: 진행 중이던 생성을 이어서 확인
  useEffect(() => {
    let cancelled = false;
    let pendingKey = "";
    try {
      const raw = sessionStorage.getItem(PENDING_TRYON_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as { cacheKey?: string; startedAt?: number };
      if (!pending.cacheKey || !pending.startedAt || Date.now() - pending.startedAt > 15 * 60 * 1000) {
        sessionStorage.removeItem(PENDING_TRYON_KEY);
        return;
      }
      pendingKey = pending.cacheKey;
      setIsGenerating(true);
      beginWaitUx();
      setElapsed(Math.max(0, Math.floor((Date.now() - pending.startedAt) / 1000)));
      setStatusText("진행 중이던 AI 룩 생성을 이어서 확인하고 있어요.");
    } catch {
      return;
    }

    pollGeneratedLook(pendingKey)
      .then((finalResult) => {
        if (!cancelled && finalResult?.imageUrl) finishSuccess(finalResult);
      })
      .catch((error) => {
        if (cancelled) return;
        try { sessionStorage.removeItem(PENDING_TRYON_KEY); } catch { /* 무시 */ }
        const errorMessage = error instanceof Error ? error.message : "AI 룩 생성 확인에 실패했습니다.";
        setStatusText(errorMessage);
        document.title = titleRef.current || document.title;
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateLook = async () => {
    if (selectedProductIds.length < minAiProducts || selectedProductIds.length > maxAiProducts || isGenerating) return;

    setIsGenerating(true);
    beginWaitUx();
    setStatusText("AI 룩 생성 중입니다. 보통 1~3분 정도 걸려요. 다른 탭을 보셔도 완료되면 알려드려요.");
    setToast({ text: "AI 룩 생성을 시작했어요 — 완료되면 소리로 알려드려요", tone: "success" });
    setResultLabel("");

    try {
      const response = await fetch("/api/generate-tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelTemplateId: selectedTemplate,
          productIds: selectedProductIds,
          // 디자이너가 입력한 프롬프트를 브랜드 무드와 함께 반영. 비우면 기본 무드.
          stylingPrompt: prompt.trim()
            ? `Brand mood: ${designer.mood}. ${prompt.trim()}`
            : `Brand mood: ${designer.mood}. Minimal K-fashion editorial full look preview.`,
          forceRegenerate: false,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json") ? await response.json() : null;
      if (!response.ok) {
        throw new Error(result?.error || `AI 생성 서버 응답 오류 (${response.status}). 잠시 후 상품 1~4개로 다시 시도해주세요.`);
      }
      let finalResult = result;
      if (result?.status === "processing" && result.cacheKey) {
        // 페이지를 떠났다 돌아와도 이어서 확인할 수 있게 진행 키 저장
        try {
          sessionStorage.setItem(PENDING_TRYON_KEY, JSON.stringify({ cacheKey: result.cacheKey, startedAt: Date.now() }));
        } catch { /* 저장 실패해도 생성에는 지장 없음 */ }
        finalResult = await pollGeneratedLook(result.cacheKey);
      }

      if (!finalResult?.imageUrl) throw new Error("AI 생성 결과 이미지가 없습니다.");
      finishSuccess(finalResult);
    } catch (error) {
      try { sessionStorage.removeItem(PENDING_TRYON_KEY); } catch { /* 무시 */ }
      document.title = titleRef.current || document.title;
      const errorMessage = error instanceof Error ? error.message : "AI 룩 생성에 실패했습니다.";
      setStatusText(errorMessage);
      setModal({ title: "AI 룩 생성에 실패했어요", message: errorMessage, tone: "error", retry: true });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="detail-layout">
      <div className="look-frame">
        <img src={previewImage} alt={`${designer.brandName} AI 룩 미리보기`} />
        {isGenerating ? (
          <div className="tryon-loading-overlay">
            <strong>AI 룩 생성 중</strong>
            <span>보통 1~3분 · {formatElapsed(elapsed)} 경과</span>
            <div className="tryon-progress" aria-hidden="true"><i style={{ width: `${progressPct}%` }} /></div>
            <span className="tryon-free-hint">
              기다리지 않으셔도 돼요 — 다른 탭을 보고 계셔도<br />
              완료되면 소리와 알림으로 알려드려요.<br />
              이 화면을 벗어나도 생성은 계속되고, 돌아오면 이어서 표시됩니다.
            </span>
          </div>
        ) : null}
      </div>

      <div className="styling-panel">
        <div>
          <p className="kicker">모델 템플릿</p>
          <div className="template-row">
            {displayModelTemplates.map((template) => (
              <button
                className={`template-button ${selectedTemplate === template.id ? "is-active" : ""}`}
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplate(template.id)}
              >
                <img src={template.image} alt={template.label} />
                <span>{template.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="product-filter-head">
            <p className="kicker">스타일링 상품</p>
            <DraggableTabs
              categories={categories}
              activeCategory={activeCategory}
              counts={selectedCategoryCounts}
              ariaLabel="상품 카테고리"
              onChange={setActiveCategory}
            />
          </div>

          <div className="product-list">
            {visibleProducts.map((product) => {
              const isActive = selectedProductIds.includes(product.id);
              return (
                <button
                  className={`product-card ${isActive ? "is-active" : ""}`}
                  key={product.id}
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  aria-pressed={isActive}
                >
                  <img src={product.image} alt={product.name} />
                  <span className="product-meta">
                    <small>{groupProductCategory(product.category)}</small>
                    <strong>{product.name}</strong>
                  </span>
                  <span className="status-badge">{isActive ? "선택됨" : product.status}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`generate-box premium-generate ${selectedProducts.length ? "is-sticky" : ""}`}>
          <div className="generate-head">
            <div>
              <p className="kicker">AI 가상 피팅</p>
              <h3>고정 모델 룩 생성</h3>
            </div>
            {resultLabel ? <strong>{resultLabel}</strong> : null}
          </div>
          <div className="selected-stack" aria-label="선택된 상품">
            {selectedProducts.length ? (
              selectedProducts.map((product) => <span key={product.id}>{product.name}</span>)
            ) : (
              <p className="notice" style={{ margin: 0 }}>상품 1~4개를 선택해주세요.</p>
            )}
          </div>
          <div className="generate-prompt">
            <label htmlFor="stylingPrompt">프롬프트 <span className="opt">(선택)</span></label>
            <textarea
              id="stylingPrompt"
              rows={2}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") generateLook();
              }}
              placeholder="예: 가을 데이트룩, 따뜻한 베이지 톤, 미니멀하게 / 스트릿 무드로 연출"
              disabled={isGenerating}
            />
            <p className="hint">원하는 무드·상황·색감을 적으면 AI가 반영해요. 비우면 브랜드 무드로 생성돼요. (⌘/Ctrl+Enter로 생성)</p>
          </div>
          <div className="generate-actions">
            <button
              className="generate-button"
              type="button"
              disabled={!selectedTemplate || selectedProducts.length < minAiProducts || selectedProducts.length > maxAiProducts || isGenerating}
              onClick={generateLook}
            >
              {isGenerating ? "생성 중..." : "AI 룩 생성"}
            </button>
            {selectedProducts.length ? (
              <button className="reset-selection-button" type="button" onClick={clearSelection} disabled={isGenerating}>
                선택 초기화
              </button>
            ) : null}
          </div>
          <p className="notice">{statusText}</p>
        </div>
      </div>

      {modal ? (
        <div className="ai-notice-modal" role="alertdialog" aria-modal="true" aria-labelledby="aiNoticeTitle" aria-describedby="aiNoticeDesc">
          <button className="ai-notice-backdrop" type="button" aria-label="닫기" onClick={() => setModal(null)} />
          <div className={`ai-notice-card ${modal.tone || ""}`}>
            <span className="ai-notice-mark" aria-hidden="true">{modal.tone === "error" ? "!" : "✓"}</span>
            <h2 id="aiNoticeTitle">{modal.title}</h2>
            <p id="aiNoticeDesc">{modal.message}</p>
            {modal.imageUrl ? (
              <img className="ai-notice-thumb" src={modal.imageUrl} alt="완성된 AI 룩 미리보기" />
            ) : null}
            <div className="ai-notice-actions">
              {modal.retry ? (
                <>
                  <button type="button" className="ai-notice-ghost" onClick={() => setModal(null)}>닫기</button>
                  <button type="button" onClick={() => { setModal(null); generateLook(); }}>다시 시도</button>
                </>
              ) : (
                <button type="button" onClick={() => setModal(null)}>확인</button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`styling-toast ${toast.tone || ""}`} role="status" aria-live="polite">
          <span className="styling-toast-ic" aria-hidden="true">{toast.tone === "warning" ? "!" : "✓"}</span>
          {toast.text}
        </div>
      ) : null}
    </section>
  );
}
