import { requireApprovedCreator } from "@/lib/auth";
import { creatorGradeProgress } from "@/lib/creator-center";
import { getCreatorMissionParticipations } from "@/lib/db";
import { creatorPersona, missionMatchesPersona } from "@/lib/creator-persona";

const GRADES = [
  { name: "STARTER", label: "시작", condition: "첫 캠페인을 준비하는 단계", benefit: "기본 캠페인 추천과 제작 가이드를 확인합니다.", minimum: 0 },
  { name: "RISING", label: "성장", condition: "완료 캠페인 1~2건", benefit: "완료 이력을 바탕으로 더 적합한 협업 기회를 추천받습니다.", minimum: 1 },
  { name: "PRO", label: "전문가", condition: "완료 캠페인 3건 이상", benefit: "검증된 완료 이력으로 우선 추천 대상이 됩니다.", minimum: 3 },
];

export default async function CreatorGradePage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { creator, isPreview } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const allMissions = await getCreatorMissionParticipations(creator.id);
  const missions = isPreview ? allMissions.filter((item) => missionMatchesPersona(item, persona)) : allMissions;
  const completed = missions.filter((mission) => mission.status === "completed").length;
  const progress = creatorGradeProgress(completed);
  const currentGrade = GRADES.find((grade) => grade.name === progress.current)!;

  return <div className="creator-campaigns-page creator-grade-page">
    <header className="creator-page-heading creator-page-heading-wide"><p>크리에이터 등급</p><h1>등급</h1><span>완료한 캠페인 이력을 바탕으로 현재 성장 단계와 다음 목표를 확인하세요.</span></header>
    <section className="creator-grade-hero"><div><p>현재 등급</p><strong>{currentGrade.label}</strong><p><span>완료 캠페인</span> {completed}<span>건</span></p></div><div>{progress.next ? <><p><span>다음 등급까지</span> {progress.remaining}<span>건 남았습니다.</span></p><progress max={progress.max} value={progress.value} aria-label="다음 등급 진행률" /><small>{progress.next} 등급은 완료 캠페인 {progress.max}건부터 시작합니다.</small></> : <><p>최고 등급을 유지하고 있습니다.</p><progress max={progress.max} value={progress.value} aria-label="최고 등급 달성" /><small>꾸준한 콘텐츠 품질과 일정 준수로 협업 이력을 이어가세요.</small></>}<small>정확한 콘텐츠 제출과 일정 준수가 등급에 반영됩니다.</small></div></section>
    <section className="creator-grade-benefits" aria-label="등급별 조건과 혜택">{GRADES.map((grade) => <article className={grade.name === progress.current ? "is-current" : ""} key={grade.name}><header><span>{String(grade.minimum).padStart(2,"0")}</span>{grade.name === progress.current ? <b>현재 등급</b> : null}</header><h2>{grade.label}</h2><p>{grade.condition}</p><div><strong>등급 안내</strong><span>{grade.benefit}</span></div></article>)}</section>
    <section className="creator-grade-guide"><div><span>등급을 높이는 방법</span><h2>좋은 협업 이력을 쌓아보세요</h2></div><ul><li>콘텐츠 마감일을 지켜주세요.</li><li>검수 의견을 반영한 제출본을 관리하세요.</li><li>게시 후 실제 성과를 최신 상태로 입력하세요.</li></ul></section>
  </div>;
}
