"use client";

// 관리자 회원 관리: 세그먼트 필터·검색·정렬로 가입 계정을 빠르게 찾는다.
import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminUserRow } from "@/lib/db";
import { getApprovalStatusLabel } from "@/lib/status-labels";

type Segment = "approved" | "pending" | "not_applied" | "admin" | "disabled";

function segmentOf(u: AdminUserRow): Segment {
  if (u.role === "admin") return "admin";
  if (!u.designer_id) return "not_applied";
  if (u.approval_status === "approved") return "approved";
  if (u.approval_status === "disabled") return "disabled";
  return "pending";
}

function statusClass(status: string) {
  if (status === "approved") return "approved";
  if (status === "disabled") return "disabled";
  return "pending";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default function AdminUsersManager({ users }: { users: AdminUserRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Segment>("all");
  const [sortAsc, setSortAsc] = useState(false);

  const withSeg = useMemo(() => users.map((u) => ({ u, seg: segmentOf(u) })), [users]);

  const counts = useMemo(() => {
    const c = { all: users.length, approved: 0, pending: 0, not_applied: 0, admin: 0, disabled: 0 };
    withSeg.forEach(({ seg }) => { c[seg] += 1; });
    return c;
  }, [withSeg, users.length]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = withSeg.filter(({ u, seg }) => {
      if (filter !== "all" && seg !== filter) return false;
      if (q && !(`${u.email} ${u.brand_name || ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
    return rows.sort((a, b) => {
      const ta = new Date(a.u.created_at).getTime();
      const tb = new Date(b.u.created_at).getTime();
      return sortAsc ? ta - tb : tb - ta;
    });
  }, [withSeg, filter, search, sortAsc]);

  const chip = (key: "all" | Segment, label: string, n: number) =>
    n || key === "all" ? (
      <button type="button" key={key} className={`apm-chip${filter === key ? " is-active" : ""}`} onClick={() => setFilter(key)}>
        {label} <b>{n}</b>
      </button>
    ) : null;

  return (
    <div className="aum">
      <div className="apm-bar">
        <div className="apm-chips">
          {chip("all", "전체", counts.all)}
          {chip("approved", "승인 디자이너", counts.approved)}
          {chip("pending", "승인 대기", counts.pending)}
          {chip("not_applied", "신청 전", counts.not_applied)}
          {chip("admin", "관리자", counts.admin)}
          {chip("disabled", "비활성", counts.disabled)}
        </div>
        <div className="apm-controls">
          <input
            className="apm-search"
            type="search"
            placeholder="이메일·브랜드 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="apm-toggle" onClick={() => setSortAsc((v) => !v)}>
            {sortAsc ? "가입 오래된순" : "가입 최신순"}
          </button>
        </div>
      </div>

      <p className="apm-result">{visible.length}명 표시 중</p>

      {visible.length ? (
        <section className="st-card members-card">
          <div className="admin-table members-table">
            <div className="admin-table-head">
              <span>계정</span>
              <span>역할</span>
              <span>브랜드 / 상태</span>
              <span className="col-date">가입일</span>
            </div>
            {visible.map(({ u }) => (
              <article className="admin-table-row" key={u.id}>
                <div className="acct-cell">
                  <span className="acct-avatar" aria-hidden="true">{(u.email[0] || "?").toUpperCase()}</span>
                  <b>{u.email}</b>
                </div>
                <span><em className={`role-tag ${u.role === "admin" ? "is-admin" : ""}`}>{u.role === "admin" ? "관리자" : "디자이너"}</em></span>
                <span className="brand-cell">
                  {u.designer_id ? (
                    <>
                      <Link className="admin-title-link" href={`/dashboard/admin/designers/${u.designer_id}`}>
                        {u.brand_name || "브랜드명 미입력"}
                      </Link>
                      <em className={`status-badge ${statusClass(u.approval_status || "pending")}`}>
                        {getApprovalStatusLabel(u.approval_status || "pending")}
                      </em>
                    </>
                  ) : u.role === "admin" ? (
                    <em className="brand-empty">-</em>
                  ) : (
                    <em className="status-badge pending">신청 전</em>
                  )}
                </span>
                <span className="col-date">{formatDate(u.created_at)}</span>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className="st-empty compact"><p>조건에 맞는 회원이 없습니다.</p></div>
      )}
    </div>
  );
}
