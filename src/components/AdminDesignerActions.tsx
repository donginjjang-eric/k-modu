"use client";

// 디자이너 상태별로 가능한 액션만 보여주는 승인 관리 버튼 (변경 후 목록 자동 새로고침)
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDesignerActions({ designerId, status }: { designerId: string; status: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const mutate = async (action: "approve" | "disable" | "reject", confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/designers/${designerId}/${action}`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "변경에 실패했습니다.");
        return;
      }
      // 서버 데이터 기준으로 배지/정렬까지 갱신
      router.refresh();
    } catch {
      setMessage("네트워크 오류로 변경하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
      {status === "approved" ? (
        <button
          className="pill light"
          type="button"
          disabled={busy}
          onClick={() => mutate("disable", "이 브랜드를 비활성화할까요? 공개 보드 노출과 스튜디오 이용이 중단됩니다.")}
        >
          비활성화
        </button>
      ) : status === "disabled" || status === "rejected" ? (
        <button className="pill" type="button" disabled={busy} onClick={() => mutate("approve")}>
          다시 승인하기
        </button>
      ) : (
        <>
          <button className="pill" type="button" disabled={busy} onClick={() => mutate("approve")}>
            승인하기
          </button>
          <button
            className="pill light"
            type="button"
            disabled={busy}
            onClick={() => mutate("reject", "이 신청을 거절할까요? 목록에 '반려' 상태로 남고, 나중에 다시 승인할 수 있습니다.")}
          >
            거절
          </button>
        </>
      )}
      {message ? <p className="notice" style={{ width: "100%" }}>{message}</p> : null}
    </div>
  );
}
