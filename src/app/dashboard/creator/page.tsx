import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { getRecommendedCampaigns } from "@/lib/creator-campaigns";
import { getCreatorMissionParticipations } from "@/lib/db";
import {
  buildCreatorCenterMetrics,
  getCreatorPerformanceRows,
  missionPreStageLabel,
  missionStageIndex,
  selectActiveMission,
} from "@/lib/creator-center";
import { creatorMissionActionHref, creatorMissionPresentation } from "@/lib/creator-mission-view";
import { campaignMatchesPersona, creatorNextActionLabel, creatorPersona, currencyMatchesPersona, missionMatchesPersona, CREATOR_PERSONAS } from "@/lib/creator-persona";

const MISSION_STAGES = ["제품 수령", "콘텐츠 제작", "검수", "게시", "정산"];

function isToday(value: string | Date | null) {
  if (!value) return false;
  const today = new Date();
  const target = new Date(value);
  return today.getFullYear() === target.getFullYear()
    && today.getMonth() === target.getMonth()
    && today.getDate() === target.getDate();
}

function deadlineLabel(value: string | Date | null) {
  if (!value) return "상시 모집";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export default async function CreatorActionHomePage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { creator, isPreview } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const [allRecommended, allMissions, allPerformanceRows] = await Promise.all([
    getRecommendedCampaigns(creator.id),
    getCreatorMissionParticipations(creator.id),
    getCreatorPerformanceRows(creator.id),
  ]);
  const recommended = isPreview ? allRecommended.filter((item) => campaignMatchesPersona(item.markets, persona)) : allRecommended;
  const missions = isPreview ? allMissions.filter((item) => missionMatchesPersona(item, persona)) : allMissions;
  const performanceRows = isPreview ? allPerformanceRows.filter((item) => currencyMatchesPersona(item.currency, persona)) : allPerformanceRows;
  const metrics = buildCreatorCenterMetrics({
    market: isPreview ? CREATOR_PERSONAS[persona].market : creator.market,
    recommendedCount: recommended.length,
    deadlineCount: recommended.filter((campaign) => isToday(campaign.application_deadline)).length,
    workItems: missions.map((mission) => ({
      status: mission.status,
      expectedReward: mission.expected_reward,
      settlementStatus: mission.settlement_status,
    })),
    performanceRows,
    administratorPreview: false,
  });
  const activeMission = selectActiveMission(missions);
  const activeStage = activeMission ? missionStageIndex(activeMission.status) : -1;

  return (
    <div className="creator-action-home">
      <header className="creator-page-heading creator-page-heading-wide">
        <p>크리에이터 활동·수익 관리</p>
        <h1>오늘의 활동</h1>
        <span>한국 공급자의 K-뷰티·패션 제품을 해외 크리에이터의 콘텐츠와 판매로 연결합니다.</span>
        {isPreview ? <b className="creator-persona-context">{CREATOR_PERSONAS[persona].label} 크리에이터 화면 · {CREATOR_PERSONAS[persona].currency}</b> : null}
      </header>

      <section className="creator-today-card" aria-labelledby="today-action-heading">
        <div>
          <p className="creator-eyebrow">가장 먼저 확인하세요</p>
          <h2 id="today-action-heading">{activeMission ? "지금 해야 할 일" : "새로운 캠페인을 찾아보세요"}</h2>
          <strong>{activeMission ? activeMission.campaign_title : "현재 진행 중인 미션이 없습니다."}</strong>
          <span>{activeMission ? creatorNextActionLabel(activeMission.status) : "내 채널과 시장에 맞는 추천 캠페인에 지원할 수 있습니다."}</span>
        </div>
        <Link className="creator-primary-action" href={activeMission ? creatorMissionActionHref(activeMission.status, activeMission.id) : `/dashboard/creator/campaigns?persona=${persona}`}>
          {activeMission ? creatorMissionPresentation(activeMission.status).actionLabel : "추천 캠페인 보기"}
        </Link>
      </section>

      <section className="creator-kpi-grid" aria-label="오늘의 활동 지표">
        <article className="is-blue"><span>추천 캠페인</span><strong>{metrics.recommendedCount}</strong><small>내 국가와 채널에 맞는 제안</small></article>
        <article className="is-yellow"><span>오늘 마감</span><strong>{metrics.deadlineCount}</strong><small>오늘 신청이 끝나는 캠페인</small></article>
        <article className="is-mint"><span>예상 수익</span><strong>{metrics.expectedEarnings}</strong><small>크리에이터 현지 통화 기준</small></article>
        <article className="is-gray"><span>누적 주문</span><strong>{metrics.totalOrders}</strong><small>게시 콘텐츠에서 발생한 누적 주문</small></article>
      </section>

      <div className="creator-home-columns creator-home-columns-primary">
        <section className="creator-recommend-summary" aria-labelledby="recommend-summary-heading">
          <div className="creator-section-heading">
            <div><p className="creator-eyebrow">한국 브랜드 해외 협업</p><h2 id="recommend-summary-heading">추천 캠페인</h2></div>
            <Link href={`/dashboard/creator/campaigns?persona=${persona}`}>전체 보기</Link>
          </div>
          {recommended.length ? (
            <ul>
              {recommended.slice(0, 3).map((campaign) => (
                <li key={campaign.id}>
                  <div><strong>{campaign.title}</strong><span><span>한국 공급자</span> · <span>{campaign.markets.join(" · ") || creator.market}</span></span></div>
                  <p><b>{campaign.reward_text || "보상 협의"}</b><small>{campaign.application_deadline ? <time dateTime={new Date(campaign.application_deadline).toISOString()} data-i18n-date="short">{deadlineLabel(campaign.application_deadline)}</time> : <span>상시 모집</span>} <span>마감</span></small></p>
                </li>
              ))}
            </ul>
          ) : <div className="creator-empty-state"><p>현재 조건에 맞는 추천 캠페인이 없습니다.</p></div>}
        </section>

        <section className="creator-mission-board" aria-labelledby="mission-board-heading">
          <div className="creator-section-heading">
            <div><p className="creator-eyebrow">진행 중인 활동</p><h2 id="mission-board-heading">내 미션 보드</h2></div>
            <Link href={`/dashboard/creator/my-campaigns?persona=${persona}`}>상세 보기</Link>
          </div>
          {activeMission ? (
            <>
              <h3>{activeMission.campaign_title}</h3>
              {activeStage < 0 ? <b className="creator-mission-prestage">{missionPreStageLabel(activeMission.status)}</b> : null}
              <p>{creatorNextActionLabel(activeMission.status)}</p>
              <ol className="creator-mission-stages">
                {MISSION_STAGES.map((stage, index) => (
                  <li key={stage} className={index < activeStage ? "is-done" : index === activeStage ? "is-current" : activeStage < 0 && index === 0 ? "is-next" : ""}>
                    <span>{index < activeStage ? "✓" : index + 1}</span><b>{stage}</b>
                  </li>
                ))}
              </ol>
            </>
          ) : <div className="creator-empty-state"><p>진행 중인 미션이 없습니다.</p><Link href="/dashboard/creator/campaigns">추천 캠페인 찾기</Link></div>}
        </section>
      </div>
    </div>
  );
}
