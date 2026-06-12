"use client";

// 디자이너 상태별로 가능한 액션만 보여주는 승인 관리 버튼 (변경 후 목록 자동 새로고침)
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDesignerActions({ designerId, status }: { designerId: string; status: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const mutate = async (action: "approve" | "disable") => {
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/designers/${designerId}/${action}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "변경에 실패했습니다.");
        return;
      }
      // 서버 데이터 기준으로 배지/정렬까지 갱신
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
      {status === "approved" ? (
        <button className="pill light" type="button" disabled={busy} onClick={() => mutate("disable")}>
          비활성화
        </button>
      ) : status === "disabled" ? (
        <button className="pill" type="button" disabled={busy} onClick={() => mutate("approve")}>
          다시 승인하기
        </button>
      ) : (
        <>
          <button className="pill" type="button" disabled={busy} onClick={() => mutate("approve")}>
            승인하기
          </button>
          <button className="pill light" type="button" disabled={busy} onClick={() => mutate("disable")}>
            거절
          </button>
        </>
      )}
      {message ? <p className="notice" style={{ width: "100%" }}>{message}</p> : null}
    </div>
  );
}
