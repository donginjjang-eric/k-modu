// 관리자: 회원 관리 목록 (구글 가입자 전체 — 신청 전 회원까지 한눈에)
import Link from "next/link";
import { getAllUsersWithDesigner } from "@/lib/db";
import { getApprovalStatusLabel } from "@/lib/status-labels";

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

export default async function AdminUsersPage() {
  const users = await getAllUsersWithDesigner();
  const designerLinked = users.filter((user) => user.designer_id).length;
  const notApplied = users.filter((user) => user.role === "designer" && !user.designer_id).length;

  return (
    <>
      <h1 className="st-title">회원 관리</h1>
      <p className="st-sub">가입한 모든 계정을 확인합니다. 디자이너 신청 전 회원도 여기에서 보여요.</p>

      <section className="st-card">
        <div className="st-sec-head">
          <h2>
            전체 {users.length}명 · 브랜드 연결 {designerLinked}명
            {notApplied ? ` · 신청 전 ${notApplied}명` : ""}
          </h2>
        </div>

        {users.length ? (
          <div className="admin-table members-table">
            <div className="admin-table-head">
              <span>계정</span>
              <span>역할</span>
              <span>브랜드 / 상태</span>
              <span className="col-date">가입일</span>
            </div>
            {users.map((user) => (
              <article className="admin-table-row" key={user.id}>
                <div className="acct-cell">
                  <b>{user.email}</b>
                </div>
                <span><em className={`role-tag ${user.role === "admin" ? "is-admin" : ""}`}>{user.role === "admin" ? "관리자" : "디자이너"}</em></span>
                <span className="brand-cell">
                  {user.designer_id ? (
                    <>
                      <Link className="admin-title-link" href={`/dashboard/admin/designers/${user.designer_id}`}>
                        {user.brand_name || "브랜드명 미입력"}
                      </Link>
                      <em className={`status-badge ${statusClass(user.approval_status || "pending")}`}>
                        {getApprovalStatusLabel(user.approval_status || "pending")}
                      </em>
                    </>
                  ) : user.role === "admin" ? (
                    <em className="brand-empty">-</em>
                  ) : (
                    <em className="status-badge pending">신청 전</em>
                  )}
                </span>
                <span className="col-date">{formatDate(user.created_at)}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="st-empty compact"><p>가입한 회원이 없습니다.</p></div>
        )}
      </section>
    </>
  );
}
