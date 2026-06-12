"use client";

// 받은 의뢰의 상태(확인/완료)를 바꾸는 버튼 — 변경 후 목록 자동 새로고침
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CollabRequestActions({ requestId, status }: { requestId: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const setStatus = async (next: "read" | "done" | "new") => {
    setBusy(true);
    try {
      const response = await fetch(`/api/designer/collab-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {status === "new" ? (
        <button className="pill" type="button" disabled={busy} onClick={() => setStatus("read")}>확인함</button>
      ) : null}
      {status !== "done" ? (
        <button className="pill light" type="button" disabled={busy} onClick={() => setStatus("done")}>처리 완료</button>
      ) : (
        <button className="pill light" type="button" disabled={busy} onClick={() => setStatus("new")}>되돌리기</button>
      )}
    </div>
  );
}
