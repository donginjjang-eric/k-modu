import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { getCreatorSettlementItems, getCreatorSettlementSummary } from "@/lib/db";
import { creatorPersona, currencyMatchesPersona } from "@/lib/creator-persona";
import { formatCreatorReward } from "@/lib/creator-rewards";

const settlementFlow = ["성과 확인", "정산 확정", "지급 처리", "지급 완료"];

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export default async function CreatorSettlementPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { creator, isPreview } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const [allSummary, allItems] = await Promise.all([
    getCreatorSettlementSummary(creator.id),
    getCreatorSettlementItems(creator.id),
  ]);
  const summary = isPreview ? allSummary.filter((item) => currencyMatchesPersona(item.currency, persona)) : allSummary;
  const items = isPreview ? allItems.filter((item) => currencyMatchesPersona(item.currency, persona)) : allItems;

  return <div className="creator-campaigns-page creator-settlement-page">
    <header className="creator-page-heading creator-page-heading-wide"><p>수익 및 정산 관리</p><h1>수익·정산</h1><span>캠페인에서 발생한 보상과 지급 진행 상황을 현지 통화 기준으로 확인하세요. 서로 다른 통화는 합산하지 않습니다.</span></header>

    {summary.length ? <section className="creator-settlement-summary" aria-label="통화별 정산 요약">{summary.map((item) => <article key={item.currency}><div><span>{item.currency}</span><small>현지 통화 기준</small></div><strong>{formatCreatorReward(item.currency, item.paid)}</strong><p>지급 완료</p><dl><div><dt>총 예상 수익</dt><dd>{formatCreatorReward(item.currency, item.expected)}</dd></div><div><dt>처리 중</dt><dd>{formatCreatorReward(item.currency, item.pending + item.confirmed)}</dd></div></dl></article>)}</section> : null}

    <section className="creator-detail-panel creator-settlement-flow"><div className="creator-detail-section-heading"><span>정산 절차</span><h2>보상은 이렇게 지급됩니다</h2></div><ol>{settlementFlow.map((stage, index) => <li key={stage}><i>{index + 1}</i><div><strong>{stage}</strong><span>{["게시 성과와 보상을 확인합니다.", "지급할 금액을 최종 확정합니다.", "운영팀이 지급을 처리합니다.", "지급 결과가 내역에 반영됩니다."][index]}</span></div></li>)}</ol></section>

    <div className="creator-settlement-columns">
      <section className="creator-detail-panel creator-settlement-ledger"><div className="creator-detail-section-heading"><span>캠페인별 내역</span><h2>정산 내역</h2></div>{items.length ? <div>{items.map((item) => <article key={item.id}><div className="creator-settlement-ledger-title"><div><span>{item.campaign_category}</span><h3>{item.campaign_title}</h3></div><b>{item.statusLabel}</b></div><div className="creator-settlement-ledger-amount"><strong>{formatCreatorReward(item.currency, item.amount)}</strong><span>확정 보상</span></div><ol>{settlementFlow.map((stage, index) => <li className={index <= item.stageIndex ? "is-active" : ""} key={stage}><i>{index < item.stageIndex ? "✓" : index + 1}</i><span>{stage}</span></li>)}</ol><footer><div><span>{item.nextAction}</span><small>최근 갱신 {dateLabel(item.updated_at)}</small></div><Link href={`/dashboard/creator/my-campaigns/${item.id}`}>미션 상세 보기</Link></footer></article>)}</div> : <div className="creator-empty-state"><h2>아직 정산 내역이 없습니다.</h2><p>캠페인의 보상 정보가 확정되면 이곳에서 진행 상황을 확인할 수 있습니다.</p></div>}</section>

      <aside className="creator-detail-panel creator-payment-guide"><div className="creator-detail-section-heading"><span>지급 정보</span><h2>지급 전 확인</h2></div><div className="creator-payment-guide-icon">✓</div><h3>현재는 운영팀 확인 방식입니다</h3><p>지급 단계가 시작되면 등록된 연락처를 통해 지급 수단을 확인합니다. 실제 지급일과 계정 정보는 확정된 경우에만 안내됩니다.</p><ul><li>통화별 보상 금액 확인</li><li>성과 정보 최신 상태 유지</li><li>운영팀 지급 안내 확인</li></ul><small>계좌·PayPal 등록과 정산서 다운로드는 다음 단계에서 제공될 예정입니다.</small></aside>
    </div>
  </div>;
}
