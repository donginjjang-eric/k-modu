"use client";

import { useState } from "react";
import type { PortfolioImageStatus } from "@/lib/types";

const LABELS: Record<PortfolioImageStatus, string> = {
  pending: "검수 대기",
  approved: "승인",
  rejected: "반려",
  hidden: "숨김",
};

export default function AdminPortfolioImageActions({
  imageId,
  status,
}: {
  imageId: string;
  status: PortfolioImageStatus;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const mutate = async (nextStatus: PortfolioImageStatus) => {
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/portfolio-images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setMessage(result.error || "상태 변경에 실패했습니다.");
      return;
    }

    setCurrentStatus(result.image.status);
    setMessage(`상태를 '${LABELS[result.image.status as PortfolioImageStatus]}'으로 변경했습니다.`);
  };

  const badgeClass =
    currentStatus === "approved" ? "approved" :
    currentStatus === "hidden" || currentStatus === "rejected" ? "disabled" :
    "pending";

  return (
    <div className="admin-actions">
      <span className={`status-badge ${badgeClass}`}>{LABELS[currentStatus]}</span>
      <button type="button" disabled={isSaving || currentStatus === "approved"} onClick={() => mutate("approved")}>
        승인
      </button>
      <button type="button" disabled={isSaving || currentStatus === "rejected"} onClick={() => mutate("rejected")}>
        반려
      </button>
      <button type="button" disabled={isSaving || currentStatus === "hidden"} onClick={() => mutate("hidden")}>
        숨김
      </button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
