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
  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds]
  );

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
  };

  return (
    <section className="detail-layout">
      <div className="look-frame">
        <img src={designer.heroImage} alt={`${designer.brandName} Full Look Preview`} />
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
          <p className="kicker">AI Lookbook Generation</p>
          <div className="selected-stack" aria-label="Selected products">
            {selectedProducts.length ? (
              selectedProducts.map((product) => <span key={product.id}>{product.name}</span>)
            ) : (
              <p className="notice" style={{ margin: 0 }}>상품을 2개 이상 선택하면 Generate 버튼이 활성화됩니다.</p>
            )}
          </div>
          <button className="generate-button" type="button" disabled={selectedProducts.length < 2}>
            Generate AI Look
          </button>
          <p className="notice">
            Phase 1에서는 페이지 틀과 UX만 구성합니다. Phase 5에서 productIds 기반 `/api/generate-tryon`이 연결됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}
