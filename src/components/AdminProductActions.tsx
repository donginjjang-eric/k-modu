"use client";

import { useState } from "react";
import type { ProductStatus } from "@/lib/types";

export default function AdminProductActions({ productId, status }: { productId: string; status: ProductStatus }) {
  const [currentStatus, setCurrentStatus] = useState<ProductStatus>(status);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
    setMessage(`Updated: ${result.product.status}`);
  };

  return (
    <div className="admin-actions">
      <span className={`status-badge ${currentStatus === "active" ? "approved" : currentStatus === "hidden" ? "disabled" : "pending"}`}>
        {currentStatus}
      </span>
      <button type="button" disabled={isSaving || currentStatus === "active"} onClick={() => mutate("active")}>
        공개
      </button>
      <button type="button" disabled={isSaving || currentStatus === "draft"} onClick={() => mutate("draft")}>
        비공개
      </button>
      <button type="button" disabled={isSaving || currentStatus === "hidden"} onClick={() => mutate("hidden")}>
        숨김
      </button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
