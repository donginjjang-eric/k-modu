"use client";

import { useState } from "react";
import type { GeneratedLookStatus } from "@/lib/types";
import { getGeneratedLookStatusLabel } from "@/lib/status-labels";

export default function AdminGeneratedLookActions({
  lookId,
  status,
}: {
  lookId: string;
  status: GeneratedLookStatus;
}) {
  const [currentStatus, setCurrentStatus] = useState<GeneratedLookStatus>(status);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const remove = async () => {
    if (!window.confirm("이 AI 룩을 영구 삭제할까요? 되돌릴 수 없습니다.")) return;
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/generated-looks/${lookId}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setMessage(result.error || "삭제에 실패했습니다.");
      return;
    }
    setDeleted(true);
  };

  const mutate = async (nextStatus: GeneratedLookStatus) => {
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/generated-looks/${lookId}`, {
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

    setCurrentStatus(result.generatedLook.status);
    setMessage(`상태를 '${getGeneratedLookStatusLabel(result.generatedLook.status)}'으로 변경했습니다.`);
  };

  const badgeClass =
    currentStatus === "approved" ? "approved" :
    currentStatus === "hidden" || currentStatus === "rejected" ? "disabled" :
    "pending";

  if (deleted) {
    return <div className="admin-actions"><small>삭제됨 — 새로고침하면 목록에서 사라집니다.</small></div>;
  }

  return (
    <div className="admin-actions">
      <span className={`status-badge ${badgeClass}`}>{getGeneratedLookStatusLabel(currentStatus)}</span>
      <button type="button" disabled={isSaving || currentStatus === "approved"} onClick={() => mutate("approved")}>
        공개 승인
      </button>
      <button type="button" disabled={isSaving || currentStatus === "rejected"} onClick={() => mutate("rejected")}>
        반려
      </button>
      <button type="button" disabled={isSaving || currentStatus === "hidden"} onClick={() => mutate("hidden")}>
        숨김
      </button>
      <button type="button" className="danger" disabled={isSaving} onClick={remove}>
        삭제
      </button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
