"use client";

import { useMemo, useState } from "react";
import DraggableTabs from "./DraggableTabs";
import { STYLING_PRODUCT_CATEGORY_LIMITS, groupStylingProductCategory } from "@/lib/product-selection-rules";

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
  const maxAiProducts = 4;
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
  const [modal, setModal] = useState<{ title: string; message: string; tone?: "success" | "warning" | "error" } | null>(null);

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
        const message = `${productCategory}는 최대 ${categoryLimit}개까지 선택할 수 있어요. 상의 1개, 하의 1개, 악세서리 2개 조합으로 선택해주세요.`;
        setStatusText(message);
        setModal({ title: "카테고리 선택 확인", message, tone: "warning" });
        return current;
      }
      if (current.length >= maxAiProducts) {
        const message = "상품은 최대 4개까지 조합할 수 있어요. 다른 상품을 고르려면 선택된 상품을 해제하거나 초기화해주세요.";
        setStatusText(message);
        setModal({ title: "선택 개수 확인", message, tone: "warning" });
        return current;
      }
      return [...current, productId];
    });
  };

  const clearSelection = () => {
    setSelectedProductIds([]);
    setPreviewImage(designer.heroImage);
    setResultLabel("");
    const message = "선택을 초기화했습니다. 상품 1~4개를 다시 골라 AI 룩을 생성해보세요.";
    setStatusText(message);
    setModal({ title: "선택 초기화 완료", message, tone: "success" });
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

      setStatusText(`AI 룩 생성 중입니다. 완료되면 자동으로 표시됩니다. (${attempt + 1}/48)`);
    }

    throw new Error("AI 생성이 오래 걸리고 있습니다. 잠시 후 내가 만든 룩 목록을 새로고침해 확인해주세요.");
  };

  const generateLook = async () => {
    if (selectedProductIds.length < minAiProducts || selectedProductIds.length > maxAiProducts || isGenerating) return;

    setIsGenerating(true);
    const startMessage = "AI 룩 생성 중입니다. 보통 1~3분 정도 걸립니다.";
    setStatusText(startMessage);
    setModal({ title: "AI 룩 생성을 시작했습니다", message: startMessage, tone: "success" });
    setResultLabel("");

    try {
      const response = await fetch("/api/generate-tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelTemplateId: selectedTemplate,
          productIds: selectedProductIds,
          stylingPrompt: `Brand mood: ${designer.mood}. Minimal K-fashion editorial full look preview.`,
          forceRegenerate: false,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json") ? await response.json() : null;
      if (!response.ok) {
        throw new Error(result?.error || `AI 생성 서버 응답 오류 (${response.status}). 잠시 후 상품 1~4개로 다시 시도해주세요.`);
      }
      const finalResult = result?.status === "processing" && result.cacheKey
        ? await pollGeneratedLook(result.cacheKey)
        : result;

      if (!finalResult?.imageUrl) throw new Error("AI 생성 결과 이미지가 없습니다.");

      setPreviewImage(finalResult.imageUrl);
      setResultLabel(finalResult.cacheHit ? "저장된 룩" : "새 AI 룩");
      const doneMessage = finalResult.cacheHit ? "저장된 AI 룩을 불러왔습니다." : "AI 룩 이미지가 생성되었습니다.";
      setStatusText(doneMessage);
      setModal({ title: "AI 룩 준비 완료", message: doneMessage, tone: "success" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "AI 룩 생성에 실패했습니다.";
      setStatusText(errorMessage);
      setModal({ title: "AI 생성 실패", message: errorMessage, tone: "error" });
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
            <strong>AI 룩 생성</strong>
            <span>AI 룩을 생성 중입니다. 보통 1~3분 정도 걸립니다.</span>
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
        <div className="ai-notice-modal" role="dialog" aria-modal="true" aria-labelledby="aiNoticeTitle">
          <button className="ai-notice-backdrop" type="button" aria-label="닫기" onClick={() => setModal(null)} />
          <div className={`ai-notice-card ${modal.tone || ""}`}>
            <span className="ai-notice-mark">{modal.tone === "error" ? "!" : "AI"}</span>
            <h2 id="aiNoticeTitle">{modal.title}</h2>
            <p>{modal.message}</p>
            <button type="button" onClick={() => setModal(null)}>확인</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
