"use client";

// 관리자: 디자이너별 일일 AI 생성 한도를 +/- 또는 직접 입력으로 조정하는 컨트롤
import { useState } from "react";

export default function GenerationLimitControl({
  designerId,
  initialLimit,
}: {
  designerId: string;
  initialLimit: number;
}) {
  const [limit, setLimit] = useState(initialLimit);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  const commit = async (next: number) => {
    const value = Math.max(0, Math.min(1000, Math.round(next)));
    setLimit(value);
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/designers/${designerId}/generation-limit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: value }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "변경에 실패했습니다.");
      setLimit(result.dailyLimit);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gen-limit-control">
      <button type="button" aria-label="한도 줄이기" disabled={saving || limit <= 0} onClick={() => commit(limit - 5)}>−</button>
      <input
        type="number"
        min={0}
        max={1000}
        value={limit}
        disabled={saving}
        onChange={(e) => setLimit(Number(e.target.value))}
        onBlur={() => commit(limit)}
      />
      <button type="button" aria-label="한도 늘리기" disabled={saving} onClick={() => commit(limit + 5)}>+</button>
      {error ? <small className="err">{error}</small> : savedAt ? <small className="ok">저장됨</small> : null}
    </div>
  );
}
