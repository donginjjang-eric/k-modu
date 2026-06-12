// 디자이너 스튜디오: 받은 의뢰함 (공개 보드에서 크리에이터가 보낸 샘플 요청/협업 제안)
import CollabRequestActions from "@/components/CollabRequestActions";
import { requireApprovedDesigner } from "@/lib/auth";
import { getCollabRequestsForDesigner } from "@/lib/db";

const TYPE_LABELS: Record<string, string> = { sample: "샘플 요청", collab: "협업 제안" };
const STATUS_LABELS: Record<string, string> = { new: "새 의뢰", read: "확인함", done: "처리 완료" };

function statusClass(status: string) {
  if (status === "done") return "approved";
  if (status === "read") return "disabled";
  return "pending";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default async function DesignerOrdersPage() {
  const { designer } = await requireApprovedDesigner();
  const requests = await getCollabRequestsForDesigner(designer.id);
  const newCount = requests.filter((item) => item.status === "new").length;

  return (
    <>
      <h1 className="st-title">📥 받은 의뢰</h1>
      <p className="st-sub">공개 페이지에서 크리에이터가 보낸 샘플 요청과 협업 제안이 이곳에 모여요.</p>

      <section className="st-card">
        <div className="st-sec-head">
          <h2>{newCount ? `새 의뢰 ${newCount}건 · ` : ""}전체 {requests.length}건</h2>
        </div>

        {requests.length ? (
          <div className="admin-table">
            <div className="admin-table-head">
              <span>보낸 사람</span>
              <span>유형</span>
              <span>상태</span>
              <span>관리</span>
            </div>
            {requests.map((item) => (
              <article className="admin-table-row" key={item.id}>
                <div>
                  <b>{item.creator_name}</b>
                  <p>{item.creator_contact} · {formatDate(item.created_at)}</p>
                  {item.message ? <p>{item.message}</p> : null}
                </div>
                <span>{TYPE_LABELS[item.request_type] || item.request_type}</span>
                <span>
                  <em className={`status-badge ${statusClass(item.status)}`}>
                    {STATUS_LABELS[item.status] || item.status}
                  </em>
                </span>
                <CollabRequestActions requestId={item.id} status={item.status} />
              </article>
            ))}
          </div>
        ) : (
          <div className="st-empty compact">
            <p>아직 받은 의뢰가 없어요. 공개 프로필이 노출되면 크리에이터의 요청이 여기로 들어와요.</p>
          </div>
        )}
      </section>
    </>
  );
}
