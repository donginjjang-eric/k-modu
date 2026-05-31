"use client";

import { useState } from "react";

export default function AdminDesignerActions({ designerId }: { designerId: string }) {
  const [message, setMessage] = useState("");

  const mutate = async (action: "approve" | "disable") => {
    setMessage("");
    const response = await fetch(`/api/admin/designers/${designerId}/${action}`, { method: "POST" });
    const result = await response.json();
    setMessage(response.ok ? `Updated: ${result.designer.approval_status}` : result.error || "Update failed.");
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
      <button className="pill" type="button" onClick={() => mutate("approve")}>Approve</button>
      <button className="pill light" type="button" onClick={() => mutate("disable")}>Disable</button>
      {message ? <p className="notice" style={{ width: "100%" }}>{message}</p> : null}
    </div>
  );
}
