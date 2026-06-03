"use client";

import { useRef, useState } from "react";
import type { Product } from "@/lib/types";

const CATEGORIES = ["상의", "하의", "아우터", "가방", "신발", "액세서리"];

type FormState = {
  name: string; category: string; supplyPrice: string; price: string;
  color: string; description: string; visibility: string;
};

const EMPTY: FormState = { name: "", category: "상의", supplyPrice: "", price: "", color: "", description: "", visibility: "active" };

export default function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [imageUrl, setImageUrl] = useState("");
  const [imageHash, setImageHash] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = (key: keyof FormState, value: string) => setForm((c) => ({ ...c, [key]: value }));

  const upload = async (file: File) => {
    setUploading(true); setMsg(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/uploads/product-image", { method: "POST", body });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error || "사진 업로드에 실패했어요.");
      setImageUrl(r.imageUrl); setImageHash(r.imageHash);
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "사진 업로드에 실패했어요.", ok: false });
    } finally {
      setUploading(false);
    }
  };

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) upload(f);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, category: form.category,
          supplyPrice: form.supplyPrice, price: form.price,
          color: form.color, description: form.description,
          imageUrl, imageHash, status: form.visibility,
        }),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error || "저장에 실패했어요.");
      setProducts((c) => [r.product, ...c]);
      setForm(EMPTY); setImageUrl(""); setImageHash("");
      setMsg({ text: "저장됐어요 ✓", ok: true });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "저장에 실패했어요.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (p: Product) => {
    const next = p.status === "active" ? "draft" : "active";
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }),
    });
    const r = await res.json();
    if (res.ok) setProducts((c) => c.map((x) => (x.id === p.id ? r.product : x)));
  };

  const remove = async (p: Product) => {
    if (!window.confirm("이 상품을 삭제할까요?")) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (res.ok) setProducts((c) => c.filter((x) => x.id !== p.id));
  };

  const canSave = !!imageUrl && !!form.name.trim() && !saving;

  return (
    <>
      <h1 className="st-title">상품 올리기</h1>
      <p className="st-sub">사진을 올리고 간단한 정보만 적으면 됩니다.</p>

      <div className="st-grid2col">
        <form className="st-card" onSubmit={submit}>
          <div className="st-step"><span className="num">1</span> 사진 올리기</div>
          <div
            className={`st-dz${drag ? " drag" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
          >
            <div className="ic">📷</div>
            <div className="big">{uploading ? "올리는 중…" : "사진을 여기로 끌어다 놓으세요"}</div>
            <div className="small">또는 눌러서 선택 · 크기는 자동으로 정리돼요</div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={(e) => onFiles(e.target.files)} />
          </div>
          {imageUrl ? (
            <div className="st-previews">
              <div className="p" style={{ backgroundImage: `url('${imageUrl}')` }}>
                <button type="button" className="x" onClick={() => { setImageUrl(""); setImageHash(""); }}>✕</button>
              </div>
            </div>
          ) : null}

          <div className="st-step" style={{ marginTop: 24 }}><span className="num">2</span> 상품 정보</div>
          <div className="st-2">
            <div className="st-field"><label>상품 이름</label>
              <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="예: 크롭 레더 재킷" /></div>
            <div className="st-field"><label>종류</label>
              <select value={form.category} onChange={(e) => setField("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select></div>
          </div>
          <div className="st-2">
            <div className="st-field"><label>공급가 <span className="opt">(도매)</span></label>
              <input value={form.supplyPrice} onChange={(e) => setField("supplyPrice", e.target.value)} placeholder="예: 180,000" /></div>
            <div className="st-field"><label>판매가 <span className="opt">(소비자)</span></label>
              <input value={form.price} onChange={(e) => setField("price", e.target.value)} placeholder="예: 320,000" /></div>
          </div>
          <div className="st-2">
            <div className="st-field"><label>색상</label>
              <input value={form.color} onChange={(e) => setField("color", e.target.value)} placeholder="예: 블랙" /></div>
            <div className="st-field"><label>설명 <span className="opt">(선택)</span></label>
              <input value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="간단한 한 줄" /></div>
          </div>
          <div className="st-field"><label>공개 여부</label>
            <select value={form.visibility} onChange={(e) => setField("visibility", e.target.value)}>
              <option value="active">공개 (협업 페이지에 노출)</option>
              <option value="draft">비공개 (나만 보기)</option>
            </select>
            <p className="hint">공개로 두면 디자이너 협업 페이지에 상품이 보여요.</p>
          </div>

          <div className="st-step" style={{ marginTop: 24 }}><span className="num">3</span> 저장</div>
          <button className="st-btn block" type="submit" disabled={!canSave}>{saving ? "저장 중…" : "저장하기"}</button>
          {msg ? <p className={`st-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p> : null}
        </form>

        <div>
          <div className="st-sec-head"><h2>내 상품 ({products.length})</h2></div>
          {products.length ? (
            <div className="st-plist">
              {products.map((p) => {
                const pub = p.status === "active";
                return (
                  <article className="st-pcard" key={p.id}>
                    <div className="img" style={{ backgroundImage: `url('${p.image_url}')` }}>
                      <span className={`badge ${pub ? "pub" : "priv"}`}>{pub ? "공개" : "비공개"}</span>
                    </div>
                    <div className="b">
                      <div className="c">{p.category}</div>
                      <div className="n">{p.name}</div>
                      <div className="st-prices">
                        {p.supply_price ? <span className="supply">공급가 {p.supply_price}</span> : null}
                        {p.price ? <span className="retail">판매가 {p.price}</span> : null}
                      </div>
                      <div className="row">
                        <button type="button" onClick={() => toggleVisibility(p)}>{pub ? "비공개로" : "공개하기"}</button>
                        <button type="button" onClick={() => remove(p)}>삭제</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="st-empty">
              <div className="ic">👕</div>
              <p>아직 올린 상품이 없어요.<br />왼쪽에서 첫 상품을 올려볼까요?</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
