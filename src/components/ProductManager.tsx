"use client";

import { useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { MAX_PRODUCT_DETAIL_IMAGES } from "@/lib/product-detail-images";
import DraggableTabs from "./DraggableTabs";

// 용어 사전: 브랜드 사진 관리와 동일한 분류 카드 UX. 상품은 사진과 달리 정보 입력 단계가 추가된다.
const FASHION_PRODUCT_KINDS: Array<{ value: string; label: string; desc: string }> = [
  { value: "상의", label: "상의", desc: "티셔츠·니트·셔츠·아우터 등 상의류" },
  { value: "하의", label: "하의", desc: "팬츠·스커트·데님 등 하의류" },
  { value: "악세서리", label: "악세서리", desc: "가방·슈즈·주얼리 등 소품" },
];
const BEAUTY_PRODUCT_KINDS: Array<{ value: string; label: string; desc: string }> = [
  { value: "스킨케어", label: "스킨케어", desc: "클렌징·토너·세럼·크림·선케어" },
  { value: "메이크업", label: "메이크업", desc: "베이스·립·아이·치크 메이크업" },
  { value: "헤어·바디", label: "헤어·바디", desc: "헤어케어·바디케어·향 제품" },
  { value: "기타", label: "기타", desc: "뷰티 도구·세트·그 밖의 제품" },
];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
// 아이폰 HEIC 포함. 빈 type(HEIC)은 서버가 실제 바이트로 판별하므로 통과시킨다.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const groupProductCategory = (category: string, mode: "fashion" | "beauty") => {
  const raw = String(category || "").trim();
  const value = raw.toLowerCase();
  if (mode === "beauty") {
    if (raw.includes("스킨") || /skin|cleanser|serum|cream|sun/.test(value)) return "스킨케어";
    if (raw.includes("메이크업") || /makeup|lip|eye|base|cheek/.test(value)) return "메이크업";
    if (raw.includes("헤어") || raw.includes("바디") || /hair|body|fragrance/.test(value)) return "헤어·바디";
    return "기타";
  }
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

const emptyForm = (mode: "fashion" | "beauty"): FormState => ({
  name: "",
  category: mode === "beauty" ? "스킨케어" : "상의",
  supplyPrice: "",
  price: "",
  color: "",
  description: "",
  visibility: "active",
});

export default function ProductManager({ initialProducts, mode = "fashion", membershipId }: { initialProducts: Product[]; mode?: "fashion" | "beauty"; membershipId: string }) {
  const workspaceType = mode === "beauty" ? "beauty_partner" : "fashion_partner";
  const workspaceHeaders = { "x-kmodu-workspace": workspaceType, "x-kmodu-membership": membershipId };
  const productKinds = mode === "beauty" ? BEAUTY_PRODUCT_KINDS : FASHION_PRODUCT_KINDS;
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [form, setForm] = useState<FormState>(() => emptyForm(mode));
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [detailImageUrls, setDetailImageUrls] = useState<string[]>([]);
  const [imageHash, setImageHash] = useState("");
  const [uploading, setUploading] = useState(false);
  const [detailUploading, setDetailUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  // 수정 중인 상품 id (null이면 신규 등록 모드). 같은 폼을 등록/수정에 재사용한다.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const additionalFileRef = useRef<HTMLInputElement>(null);
  const detailFileRef = useRef<HTMLInputElement>(null);

  const productCategories = useMemo(() => {
    return ["전체", ...productKinds.map((kind) => kind.value)];
  }, [productKinds]);
  const visibleProducts = useMemo(
    () => activeCategory === "전체" ? products : products.filter((product) => groupProductCategory(product.category, mode) === activeCategory),
    [activeCategory, mode, products],
  );

  const setField = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const uploadOne = async (file: File) => {
    if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setMsg({ text: "JPG, PNG, WEBP, HEIC 이미지만 업로드할 수 있습니다.", ok: false });
      return null;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setMsg({ text: "이미지 용량이 너무 큽니다. 8MB 이하로 줄여서 다시 올려주세요.", ok: false });
      return null;
    }
    const body = new FormData();
    body.append("image", file);
    const res = await fetch("/api/uploads/product-image", { method: "POST", headers: workspaceHeaders, body });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "사진 업로드에 실패했습니다.");
    return { imageUrl: String(result.imageUrl), imageHash: String(result.imageHash || "") };
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 1);
    if (!selected.length) {
      setMsg({ text: "이미지를 한 장 선택해주세요.", ok: false });
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const uploaded = (await Promise.all(selected.map(uploadOne))).filter((item): item is { imageUrl: string; imageHash: string } => Boolean(item));
      const next = uploaded.slice(-1).map((item) => item.imageUrl);
      setImageUrls(next);
      setImageUrl(next[0] || "");
      setImageHash(uploaded[0]?.imageHash || imageHash);
      setMsg({ text: "대표 이미지가 올라갔어요.", ok: true });
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "사진 업로드에 실패했습니다.", ok: false });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onCoverFile = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setMsg(null);
    try {
      const uploaded = await uploadOne(files[0]);
      if (!uploaded) return;
      setImageUrls((current) => [uploaded.imageUrl, ...current.slice(1, 5)]);
      setImageUrl(uploaded.imageUrl);
      setImageHash(uploaded.imageHash || imageHash);
      setMsg({ text: "대표 썸네일이 등록됐어요.", ok: true });
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "대표 썸네일 업로드에 실패했습니다.", ok: false });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onAdditionalFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!imageUrl) {
      setMsg({ text: "대표 썸네일을 먼저 등록해주세요.", ok: false });
      return;
    }
    const additionalCount = Math.max(0, imageUrls.length - 1);
    const selected = Array.from(files).slice(0, Math.max(0, 4 - additionalCount));
    if (!selected.length) {
      setMsg({ text: "추가 상품 이미지는 최대 4장까지 올릴 수 있어요.", ok: false });
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const uploaded = (await Promise.all(selected.map(uploadOne))).filter((item): item is { imageUrl: string; imageHash: string } => Boolean(item));
      setImageUrls((current) => [current[0], ...current.slice(1), ...uploaded.map((item) => item.imageUrl)].filter(Boolean).slice(0, 5));
      setMsg({ text: `추가 상품 이미지 ${uploaded.length}장이 올라갔어요.`, ok: true });
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "추가 상품 이미지 업로드에 실패했습니다.", ok: false });
    } finally {
      setUploading(false);
      if (additionalFileRef.current) additionalFileRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      setImageUrl(next[0] || "");
      return next;
    });
  };

  const onDetailFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, Math.max(0, MAX_PRODUCT_DETAIL_IMAGES - detailImageUrls.length));
    if (!selected.length) {
      setMsg({ text: "상세페이지 이미지는 최대 20장까지 올릴 수 있어요.", ok: false });
      return;
    }
    setDetailUploading(true);
    setMsg(null);
    try {
      const uploaded = (await Promise.all(selected.map(uploadOne))).filter((item): item is { imageUrl: string; imageHash: string } => Boolean(item));
      setDetailImageUrls((current) => [...current, ...uploaded.map((item) => item.imageUrl)].slice(0, MAX_PRODUCT_DETAIL_IMAGES));
      setMsg({ text: `상세페이지 이미지 ${uploaded.length}장이 올라갔어요. 위에서부터 순서대로 보여요.`, ok: true });
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "상세페이지 이미지 업로드에 실패했습니다.", ok: false });
    } finally {
      setDetailUploading(false);
      if (detailFileRef.current) detailFileRef.current.value = "";
    }
  };

  const moveDetailImage = (index: number, direction: -1 | 1) => {
    setDetailImageUrls((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      category: groupProductCategory(product.category, mode),
      supplyPrice: product.supply_price || "",
      price: product.price || "",
      color: product.color || "",
      description: product.description || "",
      visibility: product.status === "draft" ? "draft" : "active",
    });
    const existingImages = (product.image_urls?.length ? product.image_urls : [product.image_url].filter(Boolean)).slice(0, 5);
    setImageUrls(existingImages);
    setDetailImageUrls(product.detail_image_urls || []);
    setImageUrl(existingImages[0] || "");
    setImageHash(product.image_hash || "");
    setMsg(null);
    if (typeof document !== "undefined") {
      document.getElementById("product-upload")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm(mode));
    setImageUrl("");
    setImageUrls([]);
    setDetailImageUrls([]);
    setImageHash("");
    setMsg(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMsg(null);
    const payload = {
      name: form.name,
      category: form.category,
      supplyPrice: form.supplyPrice,
      price: form.price,
      color: form.color,
      description: form.description,
      imageUrl,
      imageUrls,
      detailImageUrls,
      imageHash,
      status: form.visibility,
    };
    try {
      const res = editingId
        ? await fetch(`/api/products/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...workspaceHeaders },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...workspaceHeaders },
            body: JSON.stringify(payload),
          });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || (editingId ? "상품 수정에 실패했습니다." : "상품 저장에 실패했습니다."));
      if (editingId) {
        setProducts((current) => current.map((item) => (item.id === editingId ? result.product : item)));
        setMsg({ text: "수정 완료! 변경 사항이 바로 반영됐어요.", ok: true });
      } else {
        setProducts((current) => [result.product, ...current]);
        setMsg({ text: mode === "beauty" ? "등록 완료! 내 상품 목록에 바로 반영됐어요." : "등록 완료! 내 상품 목록과 스타일링 보드에 바로 반영됐어요.", ok: true });
      }
      // 같은 분류를 연달아 올리기 쉽게, 방금 쓴 분류는 유지하고 나머지 입력만 비운다
      setEditingId(null);
      setForm({ ...emptyForm(mode), category: form.category });
      setImageUrl("");
      setImageUrls([]);
      setDetailImageUrls([]);
      setImageHash("");
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "저장에 실패했습니다.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (product: Product) => {
    const next = product.status === "active" ? "draft" : "active";
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...workspaceHeaders },
        body: JSON.stringify({ status: next }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.product) throw new Error(result.error || "공개 상태 변경에 실패했어요. 잠시 후 다시 시도해주세요.");
      setProducts((current) => current.map((item) => (item.id === product.id ? result.product : item)));
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "공개 상태 변경에 실패했어요.", ok: false });
    }
  };

  const remove = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE", headers: workspaceHeaders });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || "삭제에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setPendingDelete(null);
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "삭제에 실패했어요.", ok: false });
    }
  };

  const canSave = Boolean(imageUrl && form.name.trim() && !saving);
  const categoryCounts = useMemo(() => {
    const base = Object.fromEntries(productKinds.map((kind) => [kind.value, 0])) as Record<string, number>;
    products.forEach((product) => { base[groupProductCategory(product.category, mode)] += 1; });
    return base;
  }, [mode, productKinds, products]);
  const submitLabel = saving
    ? "저장 중..."
    : !imageUrl
      ? "사진을 선택하면 등록할 수 있어요"
      : !form.name.trim()
        ? "상품 이름을 입력해주세요"
        : editingId
          ? "수정 저장하기"
          : "상품 등록하기";

  return (
    <>
      <h1 className="st-title">{mode === "beauty" ? "상품 관리" : "상품 등록"}</h1>
      <p className="st-sub">{mode === "beauty" ? "협업할 뷰티 상품을 등록하고 공개 상태를 관리하세요." : "상품 사진과 정보를 등록하면 내 상품 목록과 스타일링 보드에 바로 반영돼요."}</p>

      <div className="st-grid2col">
        <form className="st-card" id="product-upload" onSubmit={submit}>
          {editingId ? (
            <div className="st-edit-banner">
              <span>✎ <b>{form.name || "상품"}</b> 수정 중 — 값을 고치고 저장하세요</span>
              <button type="button" onClick={cancelEdit}>취소</button>
            </div>
          ) : null}
          <div className="st-step"><span className="num">1</span> 상품 분류 선택</div>
          <p className="st-substep">어떤 상품인지 먼저 고르면 분류별로 깔끔하게 정리돼요.</p>
          <div className="portfolio-kind-picker" role="radiogroup" aria-label="상품 분류">
            {productKinds.map((kind) => (
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
          {mode === "beauty" ? (
            <div className="beauty-gallery-upload">
              <section>
                <h4>대표 썸네일 <b>1장</b></h4>
                <p>상품 목록과 상세페이지에서 가장 먼저 보이는 정사각형 이미지예요.</p>
                <button className={`beauty-cover-upload${imageUrl ? " has-image" : ""}`} type="button" onClick={() => fileRef.current?.click()}>
                  {imageUrl ? <img src={imageUrl} alt="등록된 대표 썸네일" /> : <span>대표 썸네일 선택</span>}
                  <small>{uploading ? "업로드 중..." : imageUrl ? "클릭해서 교체" : "JPG·PNG·WEBP·HEIC · 8MB 이하"}</small>
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden onChange={(event) => onCoverFile(event.target.files)} />
              </section>
              <section>
                <h4>추가 상품 이미지 <b>{Math.max(0, imageUrls.length - 1)}/4장</b></h4>
                <p>제품의 다른 각도·제형·패키지를 보여주세요. 상세페이지 이미지와는 별도예요.</p>
                <button className="product-detail-upload-button" type="button" disabled={uploading || !imageUrl || imageUrls.length >= 5} onClick={() => additionalFileRef.current?.click()}>
                  추가 상품 이미지 선택
                  <small>최대 4장 · 여러 장 동시 선택</small>
                </button>
                <input ref={additionalFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple hidden onChange={(event) => onAdditionalFiles(event.target.files)} />
                {imageUrls.length > 1 ? (
                  <div className="product-gallery-preview is-additional" aria-label="추가 상품 이미지 미리보기">
                    {imageUrls.slice(1).map((url, index) => (
                      <div className="product-gallery-preview-item" key={`${url}-${index}`} style={{ backgroundImage: `url('${url}')` }}>
                        <span>추가 {index + 1}</span>
                        <div><button type="button" aria-label={`추가 ${index + 1} 이미지 삭제`} onClick={() => removeImage(index + 1)}>삭제</button></div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          ) : (
            <>
              <div
                className={`st-dz${drag ? " drag" : ""}${imageUrl ? " has-file" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(event) => { event.preventDefault(); setDrag(false); onFiles(event.dataTransfer.files); }}
              >
                <span className="dz-kind">현재 분류: <b>{form.category}</b></span>
                <div className="big">{uploading ? "업로드 중..." : imageUrl ? "사진이 선택되었습니다" : "사진을 클릭하거나 끌어와서 업로드"}</div>
                <div className="small">JPG·PNG·WEBP·HEIC(아이폰), 8MB 이하</div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden onChange={(event) => onFiles(event.target.files)} />
              </div>
              {imageUrl ? (
                <div className="product-gallery-preview" aria-label="업로드 이미지 미리보기">
                  <div className="product-gallery-preview-item is-cover" style={{ backgroundImage: `url('${imageUrl}')` }}><span>대표 이미지</span></div>
                </div>
              ) : null}
            </>
          )}

          {mode === "beauty" ? (
            <section className="product-detail-upload">
              <div className="st-step" style={{ marginTop: 24 }}><span className="num">3</span> 상세페이지 이미지</div>
              <p className="st-substep">성분·효능·제형·사용법 이미지를 올리면 쇼핑몰 상세페이지처럼 위에서부터 이어서 보여요.</p>
              <button className="product-detail-upload-button" type="button" disabled={detailUploading || detailImageUrls.length >= MAX_PRODUCT_DETAIL_IMAGES} onClick={() => detailFileRef.current?.click()}>
                {detailUploading ? "업로드 중..." : `상세페이지 이미지 추가 (${detailImageUrls.length}/${MAX_PRODUCT_DETAIL_IMAGES})`}
                <small>최대 20장 · 여러 장 동시 선택 · 장당 8MB 이하</small>
              </button>
              <input ref={detailFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple hidden onChange={(event) => onDetailFiles(event.target.files)} />
              {detailImageUrls.length ? (
                <div className="product-detail-preview" aria-label="상세페이지 이미지 순서">
                  {detailImageUrls.map((url, index) => (
                    <article key={`${url}-${index}`}>
                      <img src={url} alt={`상세페이지 ${index + 1}번째 이미지`} />
                      <span>{index + 1}</span>
                      <div>
                        <button type="button" disabled={index === 0} onClick={() => moveDetailImage(index, -1)}>위로</button>
                        <button type="button" disabled={index === detailImageUrls.length - 1} onClick={() => moveDetailImage(index, 1)}>아래로</button>
                        <button type="button" onClick={() => setDetailImageUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))}>삭제</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="st-step" style={{ marginTop: 24 }}><span className="num">{mode === "beauty" ? "4" : "3"}</span> 상품 정보</div>
          <div className="st-field">
            <label>상품 이름</label>
            <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder={mode === "beauty" ? "예: 장벽 케어 세럼" : "예: 블랙 니트 가디건"} />
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
              <label>{mode === "beauty" ? "옵션·색상" : "색상"} <span className="opt">(선택)</span></label>
              <input value={form.color} onChange={(event) => setField("color", event.target.value)} placeholder={mode === "beauty" ? "예: 50ml · 무향" : "예: 블랙"} />
            </div>
            <div className="st-field">
              <label>설명 <span className="opt">(선택)</span></label>
              <input value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder={mode === "beauty" ? "성분, 효능, 사용감 설명" : "소재, 핏, 무드 설명"} />
            </div>
          </div>
          <div className="st-field">
            <label>공개 여부</label>
            <select value={form.visibility} onChange={(event) => setField("visibility", event.target.value)}>
              <option value="active">공개</option>
              <option value="draft">비공개</option>
            </select>
            <p className="hint">{mode === "beauty" ? "공개 상품은 파트너 상품 목록과 관리자 콘솔에 표시됩니다." : "공개 상품은 스타일링 보드와 관리자 콘솔에 표시됩니다."}</p>
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
                const isBlocked = product.approval_status === "disabled";
                const isPublic = product.status === "active" && !isBlocked;
                return (
                  <article className="st-pcard" key={product.id}>
                    <div className="img" style={{ backgroundImage: `url('${product.image_url}')` }}>
                      <span className={`badge ${isPublic ? "pub" : "priv"}`}>{isBlocked ? "관리자 비공개" : isPublic ? "공개 중" : "비공개"}</span>
                    </div>
                    <div className="b">
                      <div className="c">{groupProductCategory(product.category, mode)}</div>
                      <div className="n">{product.name}</div>
                      <div className="st-prices">
                        {product.supply_price ? <span className="supply">공급가 {product.supply_price}</span> : null}
                        {product.price ? <span className="retail">판매가 {product.price}</span> : null}
                      </div>
                      {isBlocked ? <p className="st-msg err">관리자가 비공개 처리했습니다.{product.moderation_reason ? ` 사유: ${product.moderation_reason}` : ""} 문의 후 다시 이용해 주세요.</p> : (
                        <div className="row">
                          <button type="button" onClick={() => startEdit(product)}>수정</button>
                          <button type="button" onClick={() => toggleVisibility(product)}>{isPublic ? "비공개로 전환" : "다시 공개"}</button>
                          <button type="button" onClick={() => setPendingDelete(product)}>삭제</button>
                        </div>
                      )}
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
      {pendingDelete ? (
        <div className="ai-notice-modal" role="alertdialog" aria-modal="true" aria-labelledby="productDeleteTitle" aria-describedby="productDeleteDesc">
          <button type="button" className="ai-notice-backdrop" aria-label="삭제 취소" onClick={() => setPendingDelete(null)} />
          <div className="ai-notice-card warning">
            <span className="ai-notice-mark" aria-hidden="true">!</span>
            <h2 id="productDeleteTitle">상품을 삭제할까요?</h2>
            <p id="productDeleteDesc"><b>{pendingDelete.name}</b> 상품이 파트너센터와 공개 페이지에서 내려갑니다.</p>
            <div className="ai-notice-actions">
              <button type="button" className="ai-notice-ghost" onClick={() => setPendingDelete(null)}>취소</button>
              <button type="button" onClick={() => remove(pendingDelete)}>삭제하기</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
