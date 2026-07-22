import AdminCreatorProposalActions from "@/components/AdminCreatorProposalActions";
import { getCreatorCollabProposalsForAdmin } from "@/lib/db";
import type { CreatorProposalStatus, CreatorProposalType } from "@/lib/types";

const TYPE_LABELS: Record<CreatorProposalType, string> = {
  product_seeding: "제품 시딩",
  styling_content: "스타일링 콘텐츠",
  campaign: "캠페인",
  long_term: "장기 파트너십",
};

const STATUS_LABELS: Record<CreatorProposalStatus, string> = {
  new: "신규",
  contacted: "연락 완료",
  negotiating: "조건 조율",
  matched: "매칭 완료",
  closed: "종료",
};

export default async function AdminCreatorProposalsPage() {
  const proposals = await getCreatorCollabProposalsForAdmin();

  return (
    <>
      <h1 className="st-title">크리에이터 협업 제안</h1>
      <p className="st-sub">브랜드가 공개 크리에이터 보드에서 보낸 요청입니다. 담당자가 연락한 뒤 처리 상태를 갱신하세요.</p>

      {proposals.length ? (
        <section className="st-card creator-proposal-admin-list">
          {proposals.map((proposal) => (
            <article className={`creator-proposal-admin-card is-${proposal.status}`} key={proposal.id}>
              <div className="creator-proposal-admin-head">
                <div>
                  <span>{proposal.creator_platform || "CREATOR"} · {proposal.creator_market || "GLOBAL"}</span>
                  <h2>{proposal.brand_name} → {proposal.creator_name}</h2>
                </div>
                <em className={`status-badge ${proposal.status === "new" ? "pending" : proposal.status === "matched" ? "approved" : "disabled"}`}>
                  {STATUS_LABELS[proposal.status]}
                </em>
              </div>
              <div className="creator-proposal-admin-meta">
                <div><span>제안 형태</span><b>{TYPE_LABELS[proposal.proposal_type]}</b></div>
                <div><span>담당자</span><b>{proposal.requester_name}</b></div>
                <div><span>연락처</span><b>{proposal.requester_contact}</b></div>
                <div><span>예산</span><b>{proposal.budget || "협의"}</b></div>
                <div><span>접수일</span><b>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(proposal.created_at))}</b></div>
              </div>
              <p className="creator-proposal-admin-message">{proposal.message}</p>
              <AdminCreatorProposalActions id={proposal.id} status={proposal.status} />
            </article>
          ))}
        </section>
      ) : (
        <div className="st-empty"><div className="ic">↗</div><p>아직 접수된 크리에이터 협업 제안이 없습니다.</p></div>
      )}
    </>
  );
}
