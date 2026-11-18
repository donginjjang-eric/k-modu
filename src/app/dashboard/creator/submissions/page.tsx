import Link from "next/link";
import CreatorSubmissionForm from "@/components/CreatorSubmissionForm";
import { requireApprovedCreator } from "@/lib/auth";
import { getContentSubmissionsForParticipation, getCreatorMissionParticipations } from "@/lib/db";
import { creatorNextActionLabel, creatorPersona, missionMatchesPersona } from "@/lib/creator-persona";
import { creatorStatusLabel } from "@/lib/creator-copy";

export default async function CreatorSubmissionsPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { creator, isPreview } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const allParticipations = await getCreatorMissionParticipations(creator.id);
  const participations = isPreview ? allParticipations.filter((item) => missionMatchesPersona(item, persona)) : allParticipations;
  const missions = await Promise.all(participations.map(async (participation) => ({ participation, submissions: await getContentSubmissionsForParticipation(participation.id) })));
  const editable = missions.filter(({ participation }) => participation.status === "creating" || participation.status === "review").length;
  const reviews = missions.filter(({ participation }) => participation.status === "review").length;
  const submitted = missions.reduce((sum, item) => sum + item.submissions.length, 0);

  return <div className="creator-submissions-page creator-campaigns-page">
    <header className="creator-page-heading creator-page-heading-wide"><p>콘텐츠 제작 관리</p><h1>콘텐츠 제작</h1><span>제작할 콘텐츠, 제출 현황과 검수 의견을 캠페인별로 확인하세요.</span></header>
    <section className="creator-production-summary" aria-label="콘텐츠 제작 현황"><article><span>작업 가능</span><strong>{editable}</strong><small>지금 제출할 수 있는 캠페인</small></article><article><span>검수 중</span><strong>{reviews}</strong><small>피드백을 확인할 콘텐츠</small></article><article><span>전체 제출본</span><strong>{submitted}</strong><small>누적 제출 버전</small></article></section>
    <div className="creator-production-guide" aria-label="콘텐츠 제작 흐름"><span>1 · 제품 수령</span><span>2 · 콘텐츠 제작</span><span>3 · 검수</span><span>4 · 게시</span></div>
    {missions.length ? <div className="creator-production-card-grid">{missions.map(({ participation, submissions }) => {
      const canSubmit = participation.status === "creating" || participation.status === "review";
      return <article className="creator-production-card" key={participation.id}>
        <header><div><span>{participation.campaign_category}</span><h2>{participation.campaign_title}</h2></div><b>{creatorStatusLabel(participation.status)}</b></header>
        <div className="creator-production-action"><span>지금 할 일</span><strong>{creatorNextActionLabel(participation.status)}</strong></div>
        <div className="creator-production-review"><span>최근 검수 의견</span><p>{submissions[0]?.review_note || (submissions.length ? "검수 의견을 기다리고 있습니다." : "첫 제출본을 등록하면 검수 의견을 확인할 수 있습니다.")}</p><small>{submissions.length ? `제출본 ${submissions.length}개` : "아직 제출 전"}</small></div>
        {canSubmit ? <CreatorSubmissionForm participationId={participation.id} /> : <div className="creator-production-locked">현재 단계에서는 새 제출본을 등록하지 않습니다.</div>}
        <footer><Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>미션 상세 보기</Link></footer>
      </article>;
    })}</div> : <div className="creator-empty-state"><h2>제작할 콘텐츠가 없습니다.</h2><p>캠페인 매칭 후 제작 미션이 여기에 표시됩니다.</p><Link href="/dashboard/creator/my-campaigns">내 미션 보기</Link></div>}
  </div>;
}
