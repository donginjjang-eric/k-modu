"use client";

import { useState } from "react";
import type { ProductStatus } from "@/lib/types";

export default function AdminProductActions({ productId, status }: { productId: string; status: ProductStatus }) {
  const [currentStatus, setCurrentStatus] = useState<ProductStatus>(status);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isPublic = currentStatus === "active";
  const isHidden = currentStatus === "hidden";
  const statusLabel = isPublic ? "공개 중" : isHidden ? "숨김" : "비공개";
  const nextStatus: ProductStatus = isPublic ? "draft" : "active";
  const nextLabel = isPublic ? "비공개로 전환" : "공개로 전환";

  const mutate = async (nextStatus: ProductStatus) => {
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setMessage(result.error || "Update failed.");
      return;
    }

    setCurrentStatus(result.product.status);
    setMessage(result.product.status === "active" ? "공개 상태로 변경했습니다." : result.product.status === "hidden" ? "숨김 상태로 변경했습니다." : "비공개 상태로 변경했습니다.");
  };

  return (
    <div className="admin-actions">
      <span className={`status-badge ${currentStatus === "active" ? "approved" : currentStatus === "hidden" ? "disabled" : "pending"}`}>
        현재: {statusLabel}
      </span>
      <button className={isPublic ? "danger" : "primary"} type="button" disabled={isSaving || isHidden} onClick={() => mutate(nextStatus)}>
        {isSaving ? "변경 중..." : nextLabel}
      </button>
      {isHidden ? <small>숨김 상품은 목록에서 제외된 상태입니다.</small> : null}
      {message ? <small>{message}</small> : null}
    </div>
  );
}
