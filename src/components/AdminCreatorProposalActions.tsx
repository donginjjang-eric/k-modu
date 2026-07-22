"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreatorProposalStatus } from "@/lib/types";

const OPTIONS: Array<{ value: CreatorProposalStatus; label: string }> = [
  { value: "new", label: "신규 접수" },
  { value: "contacted", label: "연락 완료" },
  { value: "negotiating", label: "조건 조율" },
  { value: "matched", label: "매칭 완료" },
  { value: "closed", label: "종료" },
];

export default function AdminCreatorProposalActions({ id, status }: { id: string; status: CreatorProposalStatus }) {
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const update = async (next: CreatorProposalStatus) => {
    setValue(next);
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/creator-proposals/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setValue(status);
        setMessage(result.error || "상태를 변경하지 못했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setValue(status);
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="proposal-admin-action">
      <select value={value} disabled={busy} onChange={(event) => update(event.target.value as CreatorProposalStatus)} aria-label="협업 제안 상태">
        {OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
