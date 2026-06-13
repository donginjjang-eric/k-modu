"use client";

import { useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import DraggableTabs from "./DraggableTabs";

const CATEGORIES = ["상의", "하의", "악세서리"];

const groupProductCategory = (category: string) => {
  const raw = String(category || "").trim();
  const value = raw.toLowerCase();
  if (raw.includes("하의") || ["bottom", "bottoms", "pants", "trouser", "trousers", "skirt"].includes(value)) return "하의";
  if (raw.includes("상의") || raw.includes("아우터") || ["top", "tops", "inner", "shirt", "outer", "outerwear", "jacket", "coat"].includes(value)) return "상의";
  return "악세서리";
};

type FormState = {
  name: string;
  category: string;
  supplyPrice: string;
  price: string;
  color: string;
  description: string;
  visibility: string;
};

const EMPTY: FormState = {
  name: "",
  category: "상의",
  supplyPrice: "",
  price: "",
  color: "",
  description: "",
  visibility: "active",
};

export default function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [imageUrl, setImageUrl] = useState("");
  const [imageHash, setImageHash] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const productCategories = useMemo(() => {
    return ["전체", ...CATEGORIES];
  }, []);
  const visibleProducts = useMemo(
    () => activeCategory === "전체" ? products : products.filter((product) => groupProductCategory(product.category) === activeCategory),
    [activeCategory, products],
  );

  const setField = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const upload = async (file: File) => {
    setUploading(true);
    setMsg(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/uploads/product-image", { method: "POST", body });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "사진 업로드에 실패했습니다.");
      setImageUrl(result.imageUrl);
      setImageHash(result.imageHash);
      setMsg({ text: "사진 업로드가 완료되었습니다.", ok: true });
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "사진 업로드에 실패했습니다.", ok: false });
    } finally {
      setUploading(false);
    }
  };

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) upload(file);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          supplyPrice: form.supplyPrice,
          price: form.price,
          color: form.color,
          description: form.description,
          imageUrl,
          imageHash,
          status: form.visibility,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "상품 저장에 실패했습니다.");
      setProducts((current) => [result.product, ...current]);
      setForm(EMPTY);
      setImageUrl("");
      setImageHash("");
      setMsg({ text: "상품이 저장되었습니다.", ok: true });
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "상품 저장에 실패했습니다.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (product: Product) => {
    const next = product.status === "active" ? "draft" : "active";
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const result = await res.json();
    if (res.ok) setProducts((current) => current.map((item) => (item.id === product.id ? result.product : item)));
  };

  const remove = async (product: Product) => {
    if (!window.confirm("이 상품을 삭제할까요?")) return;
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (res.ok) setProducts((current) => current.filter((item) => item.id !== product.id));
  };

  const canSave = Boolean(imageUrl && form.name.trim() && !saving);

  return (
    <>
      <h1 className="st-title">상품 올리기</h1>
      <p className="st-sub">사진을 올리고 기본 정보를 입력하면 디자이너 스튜디오에 저장됩니다.</p>

      <div className="st-grid2col">
        <form className="st-card" id="product-upload" onSubmit={submit}>
          <div className="st-step"><span className="num">1</span> 사진 올리기</div>
          <div
            className={`st-dz${drag ? " drag" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDrag(false);
              onFiles(event.dataTransfer.files);
            }}
          >
            <div className="ic">UP</div>
            <div className="big">{uploading ? "업로드 중..." : "사진을 여기에 놓거나 선택하세요"}</div>
            <div className="small">JPG, PNG, WEBP 파일을 지원합니다.</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => onFiles(event.target.files)}
            />
          </div>
          {imageUrl ? (
            <div className="st-previews">
              <div className="p" style={{ backgroundImage: `url('${imageUrl}')` }}>
                <button type="button" className="x" onClick={() => { setImageUrl(""); setImageHash(""); }}>X</button>
              </div>
            </div>
          ) : null}

          <div className="st-step" style={{ marginTop: 24 }}><span className="num">2</span> 상품 정보</div>
          <div className="st-2">
            <div className="st-field">
              <label>상품 이름</label>
              <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="예: 블랙 니트 가디건" />
            </div>
            <div className="st-field">
              <label>종류</label>
              <select value={form.category} onChange={(event) => setField("category", event.target.value)}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
          </div>
          <div className="st-2">
            <div className="st-field">
              <label>공급가 <span className="opt">(선택)</span></label>
              <input value={form.supplyPrice} onChange={(event) => setField("supplyPrice", event.target.value)} placeholder="예: 18000" />
            </div>
            <div className="st-field">
              <label>판매가 <span className="opt">(선택)</span></label>
              <input value={form.price} onChange={(event) => setField("price", event.target.value)} placeholder="예: 32000" />
            </div>
          </div>
          <div className="st-2">
            <div className="st-field">
              <label>색상</label>
              <input value={form.color} onChange={(event) => setField("color", event.target.value)} placeholder="예: 블랙" />
            </div>
            <div className="st-field">
              <label>설명 <span className="opt">(선택)</span></label>
              <input value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="소재, 핏, 무드 설명" />
            </div>
          </div>
          <div className="st-field">
            <label>공개 여부</label>
            <select value={form.visibility} onChange={(event) => setField("visibility", event.target.value)}>
              <option value="active">공개</option>
              <option value="draft">비공개</option>
            </select>
            <p className="hint">공개 상품은 작업 페이지와 관리자 콘솔에 표시됩니다.</p>
          </div>

          <div className="st-step" style={{ marginTop: 24 }}><span className="num">3</span> 저장</div>
          <button className="st-btn block" type="submit" disabled={!canSave}>{saving ? "저장 중..." : "저장하기"}</button>
          {msg ? <p className={`st-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p> : null}
        </form>

        <div id="my-products">
          <div className="st-sec-head product-manager-head">
            <h2>내 상품 ({visibleProducts.length}/{products.length})</h2>
            <DraggableTabs
              categories={productCategories}
              activeCategory={activeCategory}
              ariaLabel="내 상품 카테고리"
              className="compact"
              onChange={setActiveCategory}
            />
          </div>
          {visibleProducts.length ? (
            <div className="st-plist">
              {visibleProducts.map((product) => {
                const isPublic = product.status === "active";
                return (
                  <article className="st-pcard" key={product.id}>
                    <div className="img" style={{ backgroundImage: `url('${product.image_url}')` }}>
                      <span className={`badge ${isPublic ? "pub" : "priv"}`}>{isPublic ? "공개" : "비공개"}</span>
                    </div>
                    <div className="b">
                      <div className="c">{groupProductCategory(product.category)}</div>
                      <div className="n">{product.name}</div>
                      <div className="st-prices">
                        {product.supply_price ? <span className="supply">공급가 {product.supply_price}</span> : null}
                        {product.price ? <span className="retail">판매가 {product.price}</span> : null}
                      </div>
                      <div className="row">
                        <button type="button" onClick={() => toggleVisibility(product)}>{isPublic ? "비공개로" : "공개하기"}</button>
                        <button type="button" onClick={() => remove(product)}>삭제</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="st-empty">
              <div className="ic">0</div>
              <p>이 카테고리에 등록된 상품이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
