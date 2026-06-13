// 관리자: 디자이너 승인 관리 목록 (승인 대기 우선 정렬, 상태별 액션)
import Link from "next/link";
import AdminDesignerActions from "@/components/AdminDesignerActions";
import GenerationLimitControl from "@/components/GenerationLimitControl";
import { getAllDesigners, getDesignerGenerationUsage } from "@/lib/db";
import { getApprovalStatusLabel } from "@/lib/status-labels";

function statusClass(status: string) {
  if (status === "approved") return "approved";
  if (status === "disabled") return "disabled";
  return "pending";
}

const STATUS_ORDER: Record<string, number> = { pending: 0, approved: 1, rejected: 2, disabled: 3 };

export default async function AdminDesignersPage() {
  const [designers, usage] = await Promise.all([getAllDesigners(), getDesignerGenerationUsage()]);
  const totalToday = usage.reduce((sum, u) => sum + u.today_count, 0);
  // 관리자가 처리할 일(승인 대기)이 항상 맨 위로
  const sorted = [...designers].sort(
    (a, b) => (STATUS_ORDER[a.approval_status] ?? 9) - (STATUS_ORDER[b.approval_status] ?? 9),
  );
  const pendingCount = designers.filter((designer) => designer.approval_status === "pending").length;
  const approvedCount = designers.filter((designer) => designer.approval_status === "approved").length;

  return (
    <>
      <h1 className="st-title">디자이너 승인 관리</h1>
      <p className="st-sub">브랜드 접수 상태와 연락 정보를 확인하고 승인 여부를 관리합니다.</p>

      <section className="st-card">
        <div className="st-sec-head">
          <h2>
            {pendingCount ? `승인 대기 ${pendingCount}팀 · ` : ""}승인 {approvedCount}팀 · 전체 {designers.length}팀
          </h2>
        </div>

        {sorted.length ? (
          <div className="admin-table">
            <div className="admin-table-head">
              <span>브랜드</span>
              <span>국가</span>
              <span>상태</span>
              <span>관리</span>
            </div>
            {sorted.map((designer) => {
              const contact = [designer.designer_name, designer.contact_email, designer.contact_phone]
                .filter(Boolean)
                .join(" · ");
              return (
                <article className="admin-table-row" key={designer.id}>
                  <div>
                    <Link className="admin-title-link" href={`/dashboard/admin/designers/${designer.id}`}>
                      {designer.brand_name}
                    </Link>
                    <p>{contact || "연락 정보 미입력"}</p>
                    {designer.description || designer.mood ? <p>{designer.description || designer.mood}</p> : null}
                  </div>
                  <span>{designer.country || "-"}</span>
                  <span>
                    <em className={`status-badge ${statusClass(designer.approval_status)}`}>
                      {getApprovalStatusLabel(designer.approval_status)}
                    </em>
                  </span>
                  <AdminDesignerActions designerId={designer.id} status={designer.approval_status} />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="st-empty compact"><p>등록된 디자이너가 없습니다.</p></div>
        )}
      </section>

      <section className="st-card" style={{ marginTop: 18 }}>
        <div className="st-sec-head">
          <div>
            <h2>AI 생성 사용량 · 일일 한도</h2>
            <p className="st-sub tight">공개 화면에서 발생하는 실제 AI 생성(비용)을 디자이너별로 보고 한도를 조정합니다. 캐시 재사용은 비용이 없어요. 오늘 합계 {totalToday}건.</p>
          </div>
        </div>
        {usage.length ? (
          <div className="admin-table gen-usage-table">
            <div className="admin-table-head">
              <span>브랜드</span>
              <span>오늘 생성</span>
              <span>일일 한도</span>
            </div>
            {usage.map((u) => {
              const ratio = u.daily_generation_limit ? Math.min(100, Math.round((u.today_count / u.daily_generation_limit) * 100)) : 0;
              return (
                <article className="admin-table-row" key={u.id}>
                  <div>
                    <Link className="admin-title-link" href={`/dashboard/admin/designers/${u.id}`}>{u.brand_name}</Link>
                  </div>
                  <span>
                    <b>{u.today_count}</b> / {u.daily_generation_limit}
                    <div className="gen-usage-bar"><i style={{ width: `${ratio}%` }} /></div>
                  </span>
                  <GenerationLimitControl designerId={u.id} initialLimit={u.daily_generation_limit} />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="st-empty compact"><p>승인된 디자이너가 없습니다.</p></div>
        )}
      </section>
    </>
  );
}
