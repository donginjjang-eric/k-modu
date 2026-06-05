"use client";

import { useState } from "react";
import { getApprovalStatusLabel } from "@/lib/status-labels";

export default function AdminDesignerActions({ designerId }: { designerId: string }) {
  const [message, setMessage] = useState("");

  const mutate = async (action: "approve" | "disable") => {
    setMessage("");
    const response = await fetch(`/api/admin/designers/${designerId}/${action}`, { method: "POST" });
    const result = await response.json();
    setMessage(response.ok ? `상태를 '${getApprovalStatusLabel(result.designer.approval_status)}'으로 변경했습니다.` : result.error || "변경에 실패했습니다.");
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
      <button className="pill" type="button" onClick={() => mutate("approve")}>승인하기</button>
      <button className="pill light" type="button" onClick={() => mutate("disable")}>비활성화</button>
      {message ? <p className="notice" style={{ width: "100%" }}>{message}</p> : null}
    </div>
  );
}
