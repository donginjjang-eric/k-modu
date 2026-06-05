"use client";

import { useState } from "react";
import type { GeneratedLook } from "@/lib/types";

function getStatusLabel(status: GeneratedLook["status"]) {
  if (status === "approved") return "관리자 승인";
  if (status === "hidden") return "비공개";
  if (status === "rejected") return "반려";
  return "공개 요청";
}

export default function DesignerGeneratedLooks({ initialLooks }: { initialLooks: GeneratedLook[] }) {
  const [looks, setLooks] = useState(initialLooks);
  const [activeLook, setActiveLook] = useState<GeneratedLook | null>(null);
  const [savingId, setSavingId] = useState("");

  const updateStatus = async (look: GeneratedLook, status: "generated" | "hidden") => {
    setSavingId(look.id);
    const response = await fetch(`/api/generated-looks/${look.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    setSavingId("");
    if (!response.ok) return;

    setLooks((current) => current.map((item) => (item.id === look.id ? result.generatedLook : item)));
    setActiveLook((current) => current && current.id === look.id ? result.generatedLook : current);
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
              <img src={look.image_url} alt="생성된 AI 룩" />
              <span className={`badge ${look.status === "hidden" ? "priv" : "pub"}`}>{getStatusLabel(look.status)}</span>
            </button>
            <div className="look-card-body">
              <strong>{look.cache_hit ? "저장된 조합" : "AI 생성 조합"}</strong>
              <p>{look.selected_product_ids.length}개 상품 조합</p>
              <div className="row">
                <button type="button" onClick={() => setActiveLook(look)}>크게 보기</button>
                <button
                  type="button"
                  disabled={savingId === look.id}
                  onClick={() => updateStatus(look, look.status === "hidden" ? "generated" : "hidden")}
                >
                  {look.status === "hidden" ? "공개 요청" : "비공개"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {activeLook ? (
        <div className="look-modal" role="dialog" aria-modal="true" aria-label="AI 룩 크게 보기">
          <button type="button" className="look-modal-backdrop" onClick={() => setActiveLook(null)} />
          <div className="look-modal-panel">
            <button type="button" className="look-modal-close" onClick={() => setActiveLook(null)}>닫기</button>
            <img src={activeLook.image_url} alt="생성된 AI 룩 크게 보기" />
            <div className="look-modal-info">
              <strong>{getStatusLabel(activeLook.status)}</strong>
              <p>이 조합은 같은 상품 선택 시 저장된 룩으로 다시 보여줄 수 있습니다.</p>
              <div className="row">
                <button type="button" disabled={savingId === activeLook.id} onClick={() => updateStatus(activeLook, "generated")}>
                  공개 요청
                </button>
                <button type="button" disabled={savingId === activeLook.id} onClick={() => updateStatus(activeLook, "hidden")}>
                  비공개
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
