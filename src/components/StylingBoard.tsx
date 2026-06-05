"use client";

import { useMemo, useState } from "react";

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
  const maxAiProducts = 2;
  const [selectedTemplate, setSelectedTemplate] = useState(modelTemplates[0]?.id || "");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState(designer.heroImage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState("상품 2개를 선택하면 AI 룩을 생성할 수 있습니다.");
  const [resultLabel, setResultLabel] = useState("");

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  );

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId);
      if (current.length >= maxAiProducts) {
        setStatusText("현재 실시간 AI 생성은 상품 2개까지 지원합니다. 더 많은 상품은 비동기 생성 기능에서 확장합니다.");
        return current;
      }
      return [...current, productId];
    });
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
    if (selectedProductIds.length !== maxAiProducts || isGenerating) return;

    setIsGenerating(true);
    setStatusText("AI 룩 생성 중입니다. 보통 60~90초 정도 걸립니다.");
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
        throw new Error(result?.error || `AI 생성 서버 응답 오류 (${response.status}). 잠시 후 상품 2개로 다시 시도해주세요.`);
      }
      const finalResult = result?.status === "processing" && result.cacheKey
        ? await pollGeneratedLook(result.cacheKey)
        : result;

      if (!finalResult?.imageUrl) throw new Error("AI 생성 결과 이미지가 없습니다.");

      setPreviewImage(finalResult.imageUrl);
      setResultLabel(finalResult.cacheHit ? "저장된 룩" : "새 AI 룩");
      setStatusText(finalResult.cacheHit ? "저장된 AI 룩을 불러왔습니다." : "AI 룩 이미지가 생성되었습니다.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "AI 룩 생성에 실패했습니다.");
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
            <span>AI 룩을 생성 중입니다. 보통 60~90초 정도 걸립니다.</span>
          </div>
        ) : null}
      </div>

      <div className="styling-panel">
        <div>
          <p className="kicker">모델 템플릿</p>
          <div className="template-row">
            {modelTemplates.map((template) => (
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
          <p className="kicker">스타일링 상품</p>
          <div className="product-list">
            {products.map((product) => {
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
                    <small>{product.category}</small>
                    <strong>{product.name}</strong>
                  </span>
                  <span className="status-badge">{isActive ? "선택됨" : product.status}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="generate-box">
          <div className="generate-head">
            <p className="kicker">AI 룩 생성</p>
            {resultLabel ? <strong>{resultLabel}</strong> : null}
          </div>
          <div className="selected-stack" aria-label="선택된 상품">
            {selectedProducts.length ? (
              selectedProducts.map((product) => <span key={product.id}>{product.name}</span>)
            ) : (
              <p className="notice" style={{ margin: 0 }}>상품 2개를 선택해주세요.</p>
            )}
          </div>
          <button
            className="generate-button"
            type="button"
            disabled={selectedProducts.length !== maxAiProducts || isGenerating}
            onClick={generateLook}
          >
            {isGenerating ? "생성 중..." : "AI 룩 생성"}
          </button>
          <p className="notice">{statusText}</p>
        </div>
      </div>
    </section>
  );
}
