"use client";

// 관리자 상품 검수: 필터·검색·요약·일괄전환·브랜드그룹·목록뷰·호버 미리보기를 한 화면에서.
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AdminProduct } from "@/lib/db";

type Status = "active" | "draft" | "hidden";

// ProductManager와 동일한 분류 규칙 (상의/하의/악세서리)
function groupCategory(category: string) {
  const raw = String(category || "").trim();
  const value = raw.toLowerCase();
  if (raw.includes("하의") || ["bottom", "bottoms", "pants", "trouser", "trousers", "skirt"].includes(value)) return "하의";
  if (raw.includes("상의") || raw.includes("아우터") || ["top", "tops", "inner", "shirt", "outer", "outerwear", "jacket", "coat"].includes(value)) return "상의";
  return "악세서리";
}

const STATUS_LABEL: Record<Status, string> = { active: "공개 중", draft: "비공개", hidden: "숨김" };
const CATEGORIES = ["상의", "하의", "악세서리"];

export default function AdminProductsManager({ products }: { products: AdminProduct[] }) {
  const [statusMap, setStatusMap] = useState<Record<string, Status>>(
    () => Object.fromEntries(products.map((p) => [p.id, p.status as Status])),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [groupByBrand, setGroupByBrand] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const hoverRef = useRef<HTMLDivElement | null>(null);
  const hoverImg = useRef<HTMLImageElement | null>(null);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.designer_brand_name || "Unknown"))).sort(),
    [products],
  );

  const counts = useMemo(() => {
    const c = { all: products.length, active: 0, draft: 0, hidden: 0 };
    products.forEach((p) => { c[statusMap[p.id]] += 1; });
    return c;
  }, [products, statusMap]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const st = statusMap[p.id];
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (brandFilter !== "all" && (p.designer_brand_name || "Unknown") !== brandFilter) return false;
      if (categoryFilter !== "all" && groupCategory(p.category) !== categoryFilter) return false;
      if (q && !(`${p.name} ${p.designer_brand_name}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [products, statusMap, statusFilter, brandFilter, categoryFilter, search]);

  const grouped = useMemo(() => {
    if (!groupByBrand) return [{ brand: "", items: visible }];
    const map = new Map<string, AdminProduct[]>();
    visible.forEach((p) => {
      const key = p.designer_brand_name || "Unknown";
      map.set(key, [...(map.get(key) || []), p]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([brand, items]) => ({ brand, items }));
  }, [visible, groupByBrand]);

  const setStatus = async (ids: string[], next: Status) => {
    setBusy(true);
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
    setBusy(false);
  };

  const toggleOne = (p: AdminProduct) => {
    const st = statusMap[p.id];
    if (st === "hidden") return; // 숨김은 디자이너/시스템 영역 — 여기선 공개↔비공개만
    setStatus([p.id], st === "active" ? "draft" : "active");
  };

  const toggleSelect = (id: string) => {
    setSelected((cur) => {
      const copy = new Set(cur);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  };

  const bulk = async (next: Status) => {
    const ids = Array.from(selected);
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
      onClick={() => setStatusFilter(key)}
    >
      {label} <b>{n}</b>
    </button>
  );

  return (
    <div className="apm">
      <div className="apm-bar">
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
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} aria-label="브랜드 필터">
            <option value="all">전체 브랜드</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="카테고리 필터">
            <option value="all">전체 분류</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" className={`apm-toggle${groupByBrand ? " is-active" : ""}`} onClick={() => setGroupByBrand((v) => !v)}>
            브랜드별 묶기
          </button>
          <button type="button" className="apm-toggle" onClick={() => setViewMode((v) => (v === "grid" ? "list" : "grid"))}>
            {viewMode === "grid" ? "목록 보기" : "그리드 보기"}
          </button>
        </div>
      </div>

      <p className="apm-result">{visible.length}개 표시 중</p>

      {visible.length ? (
        grouped.map(({ brand, items }) => (
          <section key={brand || "all"} className="apm-group">
            {brand ? <h2 className="apm-group-head">{brand} <span>{items.length}</span></h2> : null}
            <div className={viewMode === "grid" ? "admin-gallery admin-products" : "apm-list"}>
              {items.map((p) => {
                const st = statusMap[p.id];
                const isPublic = st === "active";
                const checked = selected.has(p.id);
                return viewMode === "grid" ? (
                  <article className={`st-pcard apm-card${checked ? " is-checked" : ""}`} key={p.id}>
                    <label className="apm-check"><input type="checkbox" checked={checked} onChange={() => toggleSelect(p.id)} /></label>
                    <div
                      className="img"
                      style={{ backgroundImage: `url('${p.image_url}')` }}
                      onMouseEnter={(e) => showHover(e, p.image_url)}
                      onMouseLeave={hideHover}
                    >
                      <span className={`badge ${isPublic ? "pub" : "priv"}`}>{STATUS_LABEL[st]}</span>
                    </div>
                    <div className="b">
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
                        disabled={busy || st === "hidden"}
                        onClick={() => toggleOne(p)}
                      >
                        {st === "hidden" ? "숨김 상품" : isPublic ? "비공개로 전환" : "공개로 전환"}
                      </button>
                    </div>
                  </article>
                ) : (
                  <div className={`apm-row${checked ? " is-checked" : ""}`} key={p.id}>
                    <label className="apm-check"><input type="checkbox" checked={checked} onChange={() => toggleSelect(p.id)} /></label>
                    <div className="apm-row-thumb" style={{ backgroundImage: `url('${p.image_url}')` }} onMouseEnter={(e) => showHover(e, p.image_url)} onMouseLeave={hideHover} />
                    <div className="apm-row-name">{p.name}</div>
                    <div className="apm-row-brand">{p.designer_brand_name || "Unknown"}</div>
                    <div className="apm-row-cat">{groupCategory(p.category)}</div>
                    <span className={`status-badge ${isPublic ? "approved" : st === "hidden" ? "disabled" : "pending"}`}>{STATUS_LABEL[st]}</span>
                    <button className={`apm-action ${isPublic ? "danger" : "primary"}`} type="button" disabled={busy || st === "hidden"} onClick={() => toggleOne(p)}>
                      {st === "hidden" ? "숨김" : isPublic ? "비공개로" : "공개로"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <div className="st-empty compact"><p>조건에 맞는 상품이 없습니다.</p></div>
      )}

      {selected.size ? (
        <div className="apm-bulkbar">
          <span><b>{selected.size}개</b> 선택</span>
          <div className="apm-bulkbar-actions">
            <button type="button" className="primary" disabled={busy} onClick={() => bulk("active")}>공개로</button>
            <button type="button" className="danger" disabled={busy} onClick={() => bulk("draft")}>비공개로</button>
            <button type="button" onClick={() => setSelected(new Set())}>선택 해제</button>
          </div>
        </div>
      ) : null}

      <div className="styling-hover-preview" ref={hoverRef} aria-hidden="true"><img alt="" ref={hoverImg} /></div>
    </div>
  );
}
