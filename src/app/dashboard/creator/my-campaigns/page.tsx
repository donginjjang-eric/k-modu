import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { getCreatorMissionParticipations } from "@/lib/db";
import CreatorInvitationActions from "@/components/CreatorInvitationActions";
import { creatorNextActionLabel, creatorPersona, missionMatchesPersona } from "@/lib/creator-persona";
import { creatorStatusLabel } from "@/lib/creator-copy";
import { CREATOR_MISSION_STAGES, creatorMissionActionHref, creatorMissionPresentation, isActiveMission, isCompletedMission, missionImage } from "@/lib/creator-mission-view";

function dateLabel(value: string | null) {
  if (!value) return "일정 확인 중";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export default async function MyCampaignsPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { creator, isPreview } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const allParticipations = await getCreatorMissionParticipations(creator.id);
  const participations = isPreview ? allParticipations.filter((item) => missionMatchesPersona(item, persona)) : allParticipations;
  const activeMissions = participations.filter((item) => isActiveMission(item.status));
  const completedMissions = participations.filter((item) => isCompletedMission(item.status));
  const attentionMissions = activeMissions.filter((item) => creatorMissionPresentation(item.status).group === "attention");
  const regularMissions = activeMissions.filter((item) => creatorMissionPresentation(item.status).group === "active");
  const reviewCount = participations.filter((item) => item.status === "review").length;

  return (
    <div className="creator-missions-page creator-campaigns-page">
      <header className="creator-page-heading creator-page-heading-wide"><p>참여 캠페인</p><h1>내 미션</h1><span>지금 해야 할 일과 캠페인 진행 상황을 한눈에 확인하세요.</span></header>

      <section className="creator-mission-summary" aria-label="미션 현황 요약">
        <article><span>진행 중</span><strong>{activeMissions.length}</strong><small>지금 확인할 미션</small></article>
        <article><span>검수 대기</span><strong>{reviewCount}</strong><small>피드백을 기다리는 콘텐츠</small></article>
        <article><span>완료</span><strong>{completedMissions.length}</strong><small>마무리한 캠페인</small></article>
      </section>

      <section className="creator-mission-section" aria-labelledby="active-missions-heading">
        <div className="creator-section-heading"><div><p className="creator-eyebrow">우선 확인</p><h2 id="active-missions-heading">확인이 필요한 미션</h2></div><span>{attentionMissions.length}개</span></div>
        {attentionMissions.length ? <div className="creator-mission-card-grid">{attentionMissions.map((participation) => {
          const presentation = creatorMissionPresentation(participation.status);
          return <article className="creator-mission-card" key={participation.id}>
            <div className="creator-mission-card-media"><img src={missionImage(participation.campaign_category)} alt={`${participation.campaign_title} 캠페인`} /><span>{participation.campaign_category}</span></div>
            <div className="creator-mission-card-content">
              <div className="creator-mission-card-title"><div><span className="creator-mission-status">{creatorStatusLabel(participation.status)}</span><h3>{participation.campaign_title}</h3></div><b>{participation.expected_reward || "협의 후 안내"}</b></div>
              <div className="creator-next-action"><span>지금 해야 할 일</span><strong>{creatorNextActionLabel(participation.status)}</strong></div>
              <ol className="creator-mission-progress" aria-label="미션 진행 단계">{CREATOR_MISSION_STAGES.map((stage, index) => <li key={stage} className={index < presentation.stageIndex ? "is-done" : index === presentation.stageIndex ? "is-current" : ""}><i>{index < presentation.stageIndex ? "✓" : index + 1}</i><span>{stage}</span></li>)}</ol>
              <div className="creator-mission-meta"><div><span>콘텐츠 마감</span><strong>{dateLabel(participation.content_deadline)}</strong></div><div><span>예상 보상</span><strong>{participation.expected_reward || "협의 후 안내"}</strong></div></div>
              <div className="creator-mission-actions">{participation.status === "invited" ? <CreatorInvitationActions participationId={participation.id} /> : <Link className="creator-primary-action" href={creatorMissionActionHref(participation.status, participation.id)}>{presentation.actionLabel}</Link>}<Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>상세 보기</Link></div>
            </div>
          </article>;
        })}</div> : <div className="creator-empty-state"><h2>지금 바로 확인할 미션이 없습니다.</h2><p>진행 중인 미션은 아래에서 계속 확인할 수 있습니다.</p></div>}
      </section>

      {regularMissions.length ? <section className="creator-mission-section"><div className="creator-section-heading"><div><p className="creator-eyebrow">진행 현황</p><h2>진행 중인 미션</h2></div><span>{regularMissions.length}개</span></div><div className="creator-completed-missions">{regularMissions.map((participation) => { const presentation = creatorMissionPresentation(participation.status); return <article key={participation.id}><img src={missionImage(participation.campaign_category)} alt="" /><div><span>{creatorStatusLabel(participation.status)}</span><h3>{participation.campaign_title}</h3><p>{creatorNextActionLabel(participation.status)}</p></div><Link href={creatorMissionActionHref(participation.status, participation.id)}>{presentation.actionLabel}</Link></article>; })}</div></section> : null}

      {completedMissions.length ? <section className="creator-mission-section" aria-labelledby="completed-missions-heading"><div className="creator-section-heading"><div><p className="creator-eyebrow">활동 기록</p><h2 id="completed-missions-heading">완료한 미션</h2></div><span>{completedMissions.length}개</span></div><div className="creator-completed-missions">{completedMissions.map((participation) => <article key={participation.id}><img src={missionImage(participation.campaign_category)} alt="" /><div><span>{creatorStatusLabel(participation.status)}</span><h3>{participation.campaign_title}</h3><p>{participation.expected_reward || "협의 후 안내"}</p></div><Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>상세 보기</Link></article>)}</div></section> : null}
    </div>
  );
}
