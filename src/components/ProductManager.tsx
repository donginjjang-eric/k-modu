"use client";

import { useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import DraggableTabs from "./DraggableTabs";

// 용어 사전: 브랜드 사진 관리와 동일한 분류 카드 UX. 상품은 사진과 달리 정보 입력 단계가 추가된다.
const PRODUCT_KINDS: Array<{ value: string; label: string; desc: string }> = [
  { value: "상의", label: "상의", desc: "티셔츠·니트·셔츠·아우터 등 상의류" },
  { value: "하의", label: "하의", desc: "팬츠·스커트·데님 등 하의류" },
  { value: "악세서리", label: "악세서리", desc: "가방·슈즈·주얼리 등 소품" },
];
const CATEGORIES = PRODUCT_KINDS.map((kind) => kind.value);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
// 아이폰 HEIC 포함. 빈 type(HEIC)은 서버가 실제 바이트로 판별하므로 통과시킨다.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

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
    if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setMsg({ text: "JPG, PNG, WEBP, HEIC 이미지만 업로드할 수 있습니다.", ok: false });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setMsg({ text: "이미지 용량이 너무 큽니다. 8MB 이하로 줄여서 다시 올려주세요.", ok: false });
      return;
    }
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
      setMsg({ text: "사진이 선택됐어요. 상품 정보를 채우고 등록하면 바로 반영돼요.", ok: true });
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
      // 같은 분류를 연달아 올리기 쉽게, 방금 등록한 분류는 유지하고 나머지 입력만 비운다
      setForm({ ...EMPTY, category: form.category });
      setImageUrl("");
      setImageHash("");
      setMsg({ text: "등록 완료! 내 상품 목록과 스타일링 보드에 바로 반영됐어요.", ok: true });
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
  const categoryCounts = useMemo(() => {
    const base: Record<string, number> = { 상의: 0, 하의: 0, 악세서리: 0 };
    products.forEach((product) => { base[groupProductCategory(product.category)] += 1; });
    return base;
  }, [products]);
  const submitLabel = saving
    ? "저장 중..."
    : !imageUrl
      ? "사진을 선택하면 등록할 수 있어요"
      : !form.name.trim()
        ? "상품 이름을 입력해주세요"
        : "상품 등록하기";

  return (
    <>
      <h1 className="st-title">상품 등록</h1>
      <p className="st-sub">상품 사진과 정보를 등록하면 내 상품 목록과 스타일링 보드에 바로 반영돼요.</p>

      <div className="st-grid2col">
        <form className="st-card" id="product-upload" onSubmit={submit}>
          <div className="st-step"><span className="num">1</span> 상품 분류 선택</div>
          <p className="st-substep">어떤 상품인지 먼저 고르면 분류별로 깔끔하게 정리돼요.</p>
          <div className="portfolio-kind-picker" role="radiogroup" aria-label="상품 분류">
            {PRODUCT_KINDS.map((kind) => (
              <button
                key={kind.value}
                type="button"
                className={form.category === kind.value ? "is-active" : ""}
                onClick={() => setField("category", kind.value)}
                aria-pressed={form.category === kind.value}
              >
                <strong>{kind.label} <span>{categoryCounts[kind.value]}개</span></strong>
                <span className="desc">{kind.desc}</span>
              </button>
            ))}
          </div>

          <div className="st-step" style={{ marginTop: 24 }}><span className="num">2</span> 사진 업로드</div>
          <div
            className={`st-dz${drag ? " drag" : ""}${imageUrl ? " has-file" : ""}`}
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
            <span className="dz-kind">현재 분류: <b>{form.category}</b></span>
            <div className="ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.6" cy="8.8" r="1.9" />
                <path d="m3 17.2 5.2-5.2 4.1 4.1 2.8-2.8L21 19" />
              </svg>
            </div>
            <div className="big">{uploading ? "업로드 중..." : imageUrl ? "사진이 선택되었습니다" : "사진을 클릭하거나 끌어와서 업로드"}</div>
            <div className="small">{imageUrl ? "다른 사진으로 바꾸려면 다시 클릭하거나 끌어오세요" : "JPG·PNG·WEBP·HEIC(아이폰), 8MB 이하"}</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              hidden
              onChange={(event) => onFiles(event.target.files)}
            />
          </div>
          {imageUrl ? (
            <div className="portfolio-preview" style={{ backgroundImage: `url('${imageUrl}')` }}>
              <span className="pending-chip">등록 대기</span>
              <button type="button" onClick={() => { setImageUrl(""); setImageHash(""); }}>X</button>
            </div>
          ) : null}

          <div className="st-step" style={{ marginTop: 24 }}><span className="num">3</span> 상품 정보</div>
          <div className="st-field">
            <label>상품 이름</label>
            <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="예: 블랙 니트 가디건" />
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
              <label>색상 <span className="opt">(선택)</span></label>
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
            <p className="hint">공개 상품은 스타일링 보드와 관리자 콘솔에 표시됩니다.</p>
          </div>

          <button className="st-btn block" type="submit" disabled={!canSave} style={{ marginTop: 8 }}>{submitLabel}</button>
          {msg ? <p className={`st-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p> : null}
        </form>

        <div id="my-products">
          <div className="st-sec-head product-manager-head">
            <h2>내 상품 관리 ({visibleProducts.length}/{products.length})</h2>
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
                      <span className={`badge ${isPublic ? "pub" : "priv"}`}>{isPublic ? "공개 중" : "비공개"}</span>
                    </div>
                    <div className="b">
                      <div className="c">{groupProductCategory(product.category)}</div>
                      <div className="n">{product.name}</div>
                      <div className="st-prices">
                        {product.supply_price ? <span className="supply">공급가 {product.supply_price}</span> : null}
                        {product.price ? <span className="retail">판매가 {product.price}</span> : null}
                      </div>
                      <div className="row">
                        <button type="button" onClick={() => toggleVisibility(product)}>{isPublic ? "비공개로 전환" : "다시 공개"}</button>
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
              <p>아직 등록한 상품이 없어요. 왼쪽에서 상품을 등록하면 이곳에 정리돼요.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
