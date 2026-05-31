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
  const [selectedTemplate, setSelectedTemplate] = useState(modelTemplates[0]?.id || "");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState(designer.heroImage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState("상품을 2개 이상 선택하면 Generate 버튼이 활성화됩니다.");
  const [resultLabel, setResultLabel] = useState("");

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  );

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
  };

  const generateLook = async () => {
    if (selectedProductIds.length < 2 || isGenerating) return;

    setIsGenerating(true);
    setStatusText("AI 룩북 생성 중 · 약 20-40초");
    setResultLabel("");

    try {
      const response = await fetch("/api/generate-tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelTemplateId: selectedTemplate,
          productIds: selectedProductIds,
          stylingPrompt: `브랜드 무드: ${designer.mood}. Minimal K-fashion editorial full look preview.`,
          forceRegenerate: false,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI 룩북 생성에 실패했습니다.");

      setPreviewImage(result.imageUrl);
      setResultLabel(result.cacheHit ? "Cached Look" : "New AI Look");
      setStatusText(
        result.cacheHit
          ? "저장된 AI 착장 미리보기를 불러왔습니다."
          : "새 AI 룩북 이미지가 생성되었습니다.",
      );
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "AI 룩북 생성에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="detail-layout">
      <div className="look-frame">
        <img src={previewImage} alt={`${designer.brandName} Full Look Preview`} />
        {isGenerating ? (
          <div className="tryon-loading-overlay">
            <strong>AI Lookbook Generation</strong>
            <span>AI 룩북 생성 중 · 약 20-40초</span>
          </div>
        ) : null}
      </div>

      <div className="styling-panel">
        <div>
          <p className="kicker">Model Template</p>
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
          <p className="kicker">Styling Products</p>
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
                  <span className="status-badge">{isActive ? "Selected" : product.status}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="generate-box">
          <div className="generate-head">
            <p className="kicker">AI Lookbook Generation</p>
            {resultLabel ? <strong>{resultLabel}</strong> : null}
          </div>
          <div className="selected-stack" aria-label="Selected products">
            {selectedProducts.length ? (
              selectedProducts.map((product) => <span key={product.id}>{product.name}</span>)
            ) : (
              <p className="notice" style={{ margin: 0 }}>상품을 2개 이상 선택해주세요.</p>
            )}
          </div>
          <button
            className="generate-button"
            type="button"
            disabled={selectedProducts.length < 2 || isGenerating}
            onClick={generateLook}
          >
            {isGenerating ? "Generating..." : "Generate AI Look"}
          </button>
          <p className="notice">{statusText}</p>
        </div>
      </div>
    </section>
  );
}
