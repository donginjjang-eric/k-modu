"use client";

import { useState } from "react";

type Props = { brandName: string; description: string; mood: string };

export default function BrandForm({ brandName, description, mood }: Props) {
  const [form, setForm] = useState({ brandName, description, mood });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((c) => ({ ...c, [k]: v }));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/designer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error || "저장에 실패했어요.");
      setMsg({ text: "저장됐어요 ✓", ok: true });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "저장에 실패했어요.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="st-card" style={{ maxWidth: 560 }} onSubmit={submit}>
      <div className="st-field"><label>브랜드명</label>
        <input value={form.brandName} onChange={(e) => set("brandName", e.target.value)} /></div>
      <div className="st-field"><label>한 줄 소개</label>
        <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="예: 서울 기반 미니멀 디자이너 브랜드" /></div>
      <div className="st-field"><label>무드</label>
        <input value={form.mood} onChange={(e) => set("mood", e.target.value)} placeholder="예: 미니멀 · 블랙 · 에디토리얼" />
        <p className="hint">공개 페이지·AI 룩 생성에 참고되는 브랜드 무드예요.</p></div>
      <button className="st-btn" type="submit" disabled={saving} style={{ marginTop: 18 }}>{saving ? "저장 중…" : "저장하기"}</button>
      {msg ? <p className={`st-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p> : null}
    </form>
  );
}
