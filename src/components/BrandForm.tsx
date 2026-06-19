"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { brandName: string; designerName: string; description: string; mood: string };

export default function BrandForm({ brandName, designerName, description, mood }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ brandName, designerName, description, mood });
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
      // 세션 만료 등으로 서버가 JSON 대신 HTML(로그인 페이지)을 줄 수 있어 방어적으로 파싱
      const ct = res.headers.get("content-type") || "";
      const r = ct.includes("application/json")
        ? await res.json()
        : { ok: false, error: "로그인이 만료됐어요. 새로고침 후 다시 로그인해주세요." };
      if (!res.ok || r.ok === false) throw new Error(r.error || "저장에 실패했어요.");
      setMsg({ text: "저장됐어요. 사이드바·공개 페이지에도 반영됐어요.", ok: true });
      router.refresh(); // 사이드바/헤더(서버 컴포넌트)를 즉시 갱신해 새 브랜드명이 바로 보이게
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
      <div className="st-field"><label>디자이너 이름</label>
        <input value={form.designerName} onChange={(e) => set("designerName", e.target.value)} placeholder="예: Jeonghee Ko" />
        <p className="hint">공개 프로필의 DESIGNER 칸에 표시돼요. 해외 노출용으로 영어 이름도 가능해요.</p></div>
      <div className="st-field"><label>한 줄 소개</label>
        <textarea rows={2} maxLength={120} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="예: 서울 기반 미니멀 디자이너 브랜드" />
        <p className="hint char-count">{form.description.length} / 120자</p></div>
      <div className="st-field"><label>브랜드 무드 키워드</label>
        <input value={form.mood} onChange={(e) => set("mood", e.target.value)} placeholder="예: Minimal / Modern / Contemporary Womenswear" />
        <p className="hint">브랜드 감성 키워드를 /로 구분해 적어주세요. 최대 3개가 공개 카드 태그로 노출돼요. 상품 분류는 상품 작업에서 관리해요.</p></div>
      <button className="st-btn" type="submit" disabled={saving} style={{ marginTop: 18 }}>{saving ? "저장 중…" : "저장하기"}</button>
      {msg ? <p className={`st-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p> : null}
    </form>
  );
}
