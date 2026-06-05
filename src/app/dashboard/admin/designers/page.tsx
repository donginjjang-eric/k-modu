import Link from "next/link";
import AdminDesignerActions from "@/components/AdminDesignerActions";
import { getAllDesigners } from "@/lib/db";

function statusClass(status: string) {
  if (status === "approved") return "approved";
  if (status === "disabled") return "disabled";
  return "pending";
}

export default async function AdminDesignersPage() {
  const designers = await getAllDesigners();

  return (
    <>
      <h1 className="st-title">디자이너 승인 관리</h1>
      <p className="st-sub">브랜드 신청 상태를 확인하고 운영 노출 여부를 관리합니다.</p>

      <section className="st-card">
        <div className="st-sec-head">
          <h2>디자이너 {designers.length}개</h2>
        </div>

        {designers.length ? (
          <div className="admin-table">
            <div className="admin-table-head">
              <span>브랜드</span>
              <span>국가</span>
              <span>상태</span>
              <span>관리</span>
            </div>
            {designers.map((designer) => (
              <article className="admin-table-row" key={designer.id}>
                <div>
                  <Link className="admin-title-link" href={`/dashboard/admin/designers/${designer.id}`}>
                    {designer.brand_name}
                  </Link>
                  <p>{designer.description || designer.mood || "설명 미입력"}</p>
                </div>
                <span>{designer.country || "-"}</span>
                <span><em className={`status-badge ${statusClass(designer.approval_status)}`}>{designer.approval_status}</em></span>
                <AdminDesignerActions designerId={designer.id} />
              </article>
            ))}
          </div>
        ) : (
          <div className="st-empty compact"><p>등록된 디자이너가 없습니다.</p></div>
        )}
      </section>
    </>
  );
}
