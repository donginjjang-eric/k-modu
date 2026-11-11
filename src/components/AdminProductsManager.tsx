"use client";

// 관리자 상품 검수: 필터·검색·요약·일괄전환·브랜드그룹·목록뷰·호버 미리보기를 한 화면에서.
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import AdminImageWithFallback from "@/components/AdminImageWithFallback";
import AdminPagination from "@/components/AdminPagination";
import type { AdminProduct } from "@/lib/db";
import { paginateAdminItems, reconcilePageSelection } from "@/lib/admin-list-utils";
import { MAX_PRODUCT_DETAIL_IMAGES } from "@/lib/product-detail-images";

type Status = "active" | "draft" | "hidden";
type ProductField = "beauty" | "fashion";

// 패션과 뷰티 상품을 같은 관리자 화면에서 원래 분류 그대로 보여준다.
function groupCategory(category: string) {
  const raw = String(category || "").trim();
  const value = raw.toLowerCase();
  if (raw.includes("스킨") || /skin|cleanser|serum|cream|sun/.test(value)) return "스킨케어";
  if (raw.includes("메이크업") || /makeup|lip|eye|base|cheek/.test(value)) return "메이크업";
  if (raw.includes("헤어") || raw.includes("바디") || /hair|body|fragrance/.test(value)) return "헤어·바디";
  if (raw === "기타" || ["beauty", "beauty-tool", "beauty-tools"].includes(value)) return "기타";
  if (raw.includes("하의") || ["bottom", "bottoms", "pants", "trouser", "trousers", "skirt"].includes(value)) return "하의";
  if (raw.includes("상의") || raw.includes("아우터") || ["top", "tops", "inner", "shirt", "outer", "outerwear", "jacket", "coat"].includes(value)) return "상의";
  return "악세서리";
}

const BEAUTY_CATEGORIES = ["스킨케어", "메이크업", "헤어·바디", "기타"];
const FASHION_CATEGORIES = ["상의", "하의", "악세서리"];

// 현재 products 테이블에서 모든 상품에 공통으로 저장되는 category를 기준으로 분야를 판별한다.
function productField(product: AdminProduct): ProductField {
  return BEAUTY_CATEGORIES.includes(groupCategory(product.category)) ? "beauty" : "fashion";
}

const STATUS_LABEL: Record<Status, string> = { active: "공개 중", draft: "비공개", hidden: "숨김" };
const FIELD_LABEL: Record<ProductField, { ko: string; en: string }> = {
  beauty: { ko: "K-뷰티", en: "BEAUTY" },
  fashion: { ko: "K-패션", en: "FASHION" },
};

export default function AdminProductsManager({ products }: { products: AdminProduct[] }) {
  const [statusMap, setStatusMap] = useState<Record<string, Status>>(
    () => Object.fromEntries(products.map((p) => [p.id, p.status as Status])),
  );
  const [approvalMap, setApprovalMap] = useState<Record<string, string>>(
    () => Object.fromEntries(products.map((p) => [p.id, p.approval_status || "approved"])),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [productFieldFilter, setProductFieldFilter] = useState<"all" | ProductField>("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [groupByBrand, setGroupByBrand] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const hoverRef = useRef<HTMLDivElement | null>(null);
  const hoverImg = useRef<HTMLImageElement | null>(null);

  const productsInField = useMemo(
    () => productFieldFilter === "all" ? products : products.filter((p) => productField(p) === productFieldFilter),
    [productFieldFilter, products],
  );

  const brands = useMemo(
    () => Array.from(new Set(productsInField.map((p) => p.designer_brand_name || "Unknown"))).sort(),
    [productsInField],
  );

  const categories = productFieldFilter === "beauty"
    ? BEAUTY_CATEGORIES
    : productFieldFilter === "fashion"
      ? FASHION_CATEGORIES
      : [...BEAUTY_CATEGORIES, ...FASHION_CATEGORIES];

  const fieldCounts = useMemo(() => ({
    all: products.length,
    beauty: products.filter((p) => productField(p) === "beauty").length,
    fashion: products.filter((p) => productField(p) === "fashion").length,
  }), [products]);

  const counts = useMemo(() => {
    const c = { all: products.length, active: 0, draft: 0, hidden: 0 };
    products.forEach((p) => { c[statusMap[p.id]] += 1; });
    return c;
  }, [products, statusMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const st = statusMap[p.id];
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (productFieldFilter !== "all" && productField(p) !== productFieldFilter) return false;
      if (brandFilter !== "all" && (p.designer_brand_name || "Unknown") !== brandFilter) return false;
      if (categoryFilter !== "all" && groupCategory(p.category) !== categoryFilter) return false;
      if (q && !(`${p.name} ${p.designer_brand_name}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [products, statusMap, statusFilter, productFieldFilter, brandFilter, categoryFilter, search]);
  const pageProducts = useMemo(() => paginateAdminItems(filtered, currentPage), [currentPage, filtered]);
  const pageProductIds = useMemo(() => pageProducts.map((product) => product.id), [pageProducts]);
  const selectedOnPage = useMemo(
    () => new Set(reconcilePageSelection(selected, pageProductIds)),
    [pageProductIds, selected],
  );

  const grouped = useMemo(() => {
    if (!groupByBrand) return [{ brand: "", items: pageProducts }];
    const map = new Map<string, AdminProduct[]>();
    pageProducts.forEach((p) => {
      const key = p.designer_brand_name || "Unknown";
      map.set(key, [...(map.get(key) || []), p]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([brand, items]) => ({ brand, items }));
  }, [pageProducts, groupByBrand]);

  const resetPage = () => {
    setCurrentPage(1);
    setSelected(new Set());
  };

  const changePage = (page: number) => {
    setCurrentPage(page);
    setSelected(new Set());
  };

  const setStatus = async (ids: string[], next: Status) => {
    setBusy(true);
    setNotice("");
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      }).then((r) => (r.ok ? id : Promise.reject(new Error("fail"))))),
    );
    setStatusMap((cur) => {
      const copy = { ...cur };
      results.forEach((r) => { if (r.status === "fulfilled") copy[r.value] = next; });
      return copy;
    });
    const mutatedIds = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    setSelected((current) => new Set(reconcilePageSelection(current, pageProductIds, mutatedIds)));
    // 실패를 조용히 넘기지 않는다 — 몇 건이 안 됐는지 관리자에게 알린다
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) {
      setNotice(`${failed}개 상품은 변경에 실패했어요. 잠시 후 다시 시도해주세요.`);
    }
    setBusy(false);
  };

  const toggleOne = (p: AdminProduct) => {
    const st = statusMap[p.id];
    if (st === "hidden" || approvalMap[p.id] === "disabled") return;
    setStatus([p.id], st === "active" ? "draft" : "active");
  };

  const approveOne = async (productId: string) => {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "approved" }),
      });
      if (!response.ok) throw new Error("상품 승인에 실패했어요.");
      setApprovalMap((current) => ({ ...current, [productId]: "approved" }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "상품 승인에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const suspendOne = async (productId: string) => {
    const reason = window.prompt("상품을 내리는 이유를 입력해 주세요. 사업자는 직접 다시 공개할 수 없습니다.")?.trim();
    if (!reason) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "disabled", reason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "상품을 내리지 못했습니다.");
      setApprovalMap((current) => ({ ...current, [productId]: "disabled" }));
      setNotice("상품을 비공개 처리했습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "상품을 내리지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((cur) => {
      const copy = new Set(cur);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  };

  const bulk = async (next: Status) => {
    const ids = Array.from(selectedOnPage);
    if (!ids.length) return;
    await setStatus(ids, next);
    setSelected(new Set());
  };

  const showHover = (e: React.MouseEvent, src: string) => {
    if (!window.matchMedia("(hover: hover) and (min-width: 961px)").matches) return;
    const el = hoverRef.current, img = hoverImg.current;
    if (!el || !img) return;
    img.src = src;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const W = 300, H = 360;
    let left = rect.left - W - 16;
    if (left < 12) left = Math.min(rect.right + 16, window.innerWidth - W - 12);
    el.style.left = `${left}px`;
    el.style.top = `${Math.max(12, Math.min(rect.top, window.innerHeight - H - 12))}px`;
    el.classList.add("is-visible");
  };
  const hideHover = () => hoverRef.current?.classList.remove("is-visible");

  const filterChip = (key: "all" | Status, label: string, n: number) => (
    <button
      type="button"
      className={`apm-chip${statusFilter === key ? " is-active" : ""}`}
      onClick={() => { setStatusFilter(key); resetPage(); }}
    >
      {label} <b>{n}</b>
    </button>
  );

  const fieldChip = (key: "all" | ProductField, label: string, n: number) => (
    <button
      type="button"
      className={`apm-field-chip${productFieldFilter === key ? " is-active" : ""}${key !== "all" ? ` is-${key}` : ""}`}
      onClick={() => {
        setProductFieldFilter(key);
        setBrandFilter("all");
        setCategoryFilter("all");
        resetPage();
      }}
    >
      {label} <b>{n}</b>
    </button>
  );

  return (
    <div className="apm">
      <div className="apm-bar">
        <div className="apm-field-filter" aria-label="상품 분야 필터">
          <span className="apm-field-title">상품 분야</span>
          <div className="apm-field-chips">
            {fieldChip("all", "전체", fieldCounts.all)}
            {fieldChip("beauty", "K-뷰티", fieldCounts.beauty)}
            {fieldChip("fashion", "K-패션", fieldCounts.fashion)}
          </div>
        </div>
        <div className="apm-chips">
          {filterChip("all", "전체", counts.all)}
          {filterChip("active", "공개", counts.active)}
          {filterChip("draft", "비공개", counts.draft)}
          {filterChip("hidden", "숨김", counts.hidden)}
        </div>
        <div className="apm-controls">
          <input
            className="apm-search"
            type="search"
            placeholder="상품명·브랜드 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          />
          <select value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); resetPage(); }} aria-label="브랜드 필터">
            <option value="all">전체 브랜드</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); resetPage(); }} aria-label="카테고리 필터">
            <option value="all">전체 분류</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" className={`apm-toggle${groupByBrand ? " is-active" : ""}`} onClick={() => { setGroupByBrand((v) => !v); resetPage(); }}>
            브랜드별 묶기
          </button>
          <button type="button" className="apm-toggle" onClick={() => setViewMode((v) => (v === "grid" ? "list" : "grid"))}>
            {viewMode === "grid" ? "목록 보기" : "그리드 보기"}
          </button>
        </div>
      </div>

      <AdminPagination total={filtered.length} currentPage={currentPage} onPageChange={changePage} unit="개" />
      {notice ? <p className="apm-notice" role="alert">{notice}</p> : null}

      {filtered.length ? (
        grouped.map(({ brand, items }) => (
          <section key={brand || "all"} className="apm-group">
            {brand ? <h2 className="apm-group-head">{brand} <span>{items.length}</span></h2> : null}
            <div className={viewMode === "grid" ? "admin-gallery admin-products" : "apm-list"}>
              {items.map((p) => {
                const st = statusMap[p.id];
                const field = productField(p);
                const isApproved = approvalMap[p.id] === "approved";
                const isBlocked = approvalMap[p.id] === "disabled";
                const isPublic = st === "active" && !isBlocked;
                const checked = selectedOnPage.has(p.id);
                return viewMode === "grid" ? (
                  <article className={`st-pcard apm-card${checked ? " is-checked" : ""}`} key={p.id}>
                    <label className="apm-check"><input type="checkbox" checked={checked} onChange={() => toggleSelect(p.id)} /></label>
                    <div
                      className="img"
                      onMouseEnter={(e) => showHover(e, p.image_url)}
                      onMouseLeave={hideHover}
                    >
                      <AdminImageWithFallback src={p.image_url} alt={`${p.name} 상품 이미지`} width={600} height={800} />
                      <span className={`badge ${isPublic ? "pub" : "priv"}`}>{STATUS_LABEL[st]}</span>
                    </div>
                    <div className="b">
                      <span className={`apm-field-badge is-${field}`} title={FIELD_LABEL[field].ko}>{FIELD_LABEL[field].en}</span>
                      <span className={`status-badge ${isApproved ? "approved" : isBlocked ? "disabled" : "pending"}`}>{isApproved ? "승인 완료" : isBlocked ? "관리자 비공개" : "승인 대기"}</span>
                      <span className="status-badge approved">상세 {p.detail_image_urls?.length || 0}/{MAX_PRODUCT_DETAIL_IMAGES}</span>
                      <div className="c">
                        {p.designer_id ? <Link href={`/dashboard/admin/designers/${p.designer_id}`}>{p.designer_brand_name || "Unknown"}</Link> : (p.designer_brand_name || "Unknown")}
                      </div>
                      <div className="n">{p.name}</div>
                      <div className="st-prices">
                        <span className="supply">{groupCategory(p.category)}</span>
                        {p.price ? <span className="retail">{p.price}</span> : null}
                      </div>
                      <button
                        className={`apm-action ${isPublic ? "danger" : "primary"}`}
                        type="button"
                        disabled={busy || st === "hidden" || isBlocked}
                        onClick={() => toggleOne(p)}
                      >
                        {isBlocked ? "제재 중" : st === "hidden" ? "숨김 상품" : isPublic ? "비공개로 전환" : "공개로 전환"}
                      </button>
                      {!isApproved ? <button className="apm-action primary" type="button" disabled={busy} onClick={() => approveOne(p.id)}>{isBlocked ? "복구하기" : "승인하기"}</button> : <button className="apm-action danger" type="button" disabled={busy} onClick={() => suspendOne(p.id)}>관리자 비공개</button>}
                    </div>
                  </article>
                ) : (
                  <div className={`apm-row${checked ? " is-checked" : ""}`} key={p.id}>
                    <label className="apm-check"><input type="checkbox" checked={checked} onChange={() => toggleSelect(p.id)} /></label>
                    <div className="apm-row-thumb" onMouseEnter={(e) => showHover(e, p.image_url)} onMouseLeave={hideHover}>
                      <AdminImageWithFallback src={p.image_url} alt={`${p.name} 상품 이미지`} width={96} height={96} />
                    </div>
                    <div className="apm-row-name"><span className={`apm-field-badge is-${field}`} title={FIELD_LABEL[field].ko}>{FIELD_LABEL[field].en}</span>{p.name}<small>상세 {p.detail_image_urls?.length || 0}/{MAX_PRODUCT_DETAIL_IMAGES}</small></div>
                    <div className="apm-row-brand">{p.designer_brand_name || "Unknown"}</div>
                    <div className="apm-row-cat">{groupCategory(p.category)}</div>
                    <span className={`status-badge ${isPublic ? "approved" : st === "hidden" || isBlocked ? "disabled" : "pending"}`}>{isBlocked ? "공개 차단" : STATUS_LABEL[st]}</span>
                    <span className={`status-badge ${isApproved ? "approved" : isBlocked ? "disabled" : "pending"}`}>{isApproved ? "승인 완료" : isBlocked ? "관리자 비공개" : "승인 대기"}</span>
                    <button className={`apm-action ${isPublic ? "danger" : "primary"}`} type="button" disabled={busy || st === "hidden" || isBlocked} onClick={() => toggleOne(p)}>
                      {isBlocked ? "제재 중" : st === "hidden" ? "숨김" : isPublic ? "비공개로" : "공개로"}
                    </button>
                    {!isApproved ? <button className="apm-action primary" type="button" disabled={busy} onClick={() => approveOne(p.id)}>{isBlocked ? "복구하기" : "승인하기"}</button> : <button className="apm-action danger" type="button" disabled={busy} onClick={() => suspendOne(p.id)}>관리자 비공개</button>}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <div className="st-empty compact"><p>조건에 맞는 상품이 없습니다.</p></div>
      )}

      {selectedOnPage.size ? (
        <div className="apm-bulkbar">
          <span><b>{selectedOnPage.size}개</b> 선택</span>
          <div className="apm-bulkbar-actions">
            <button type="button" className="primary" disabled={busy} onClick={() => bulk("active")}>공개로</button>
            <button type="button" className="danger" disabled={busy} onClick={() => bulk("draft")}>비공개로</button>
            <button type="button" onClick={() => setSelected(new Set())}>선택 해제</button>
          </div>
        </div>
      ) : null}

      <div className="styling-hover-preview" ref={hoverRef} aria-hidden="true">
        <img alt="" ref={hoverImg} width={300} height={400} loading="lazy" decoding="async" />
      </div>
    </div>
  );
}
