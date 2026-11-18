import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { creatorRate, getCreatorPerformanceRows } from "@/lib/creator-center";
import { creatorPersona, currencyMatchesPersona } from "@/lib/creator-persona";

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
const money = (value: number, currency: string) => currency === "MYR" ? `RM ${number(value)}` : `${currency} ${number(value)}`;

export default async function CreatorPerformancePage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { creator, isPreview } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const allRows = await getCreatorPerformanceRows(creator.id);
  const rows = isPreview ? allRows.filter((row) => currencyMatchesPersona(row.currency, persona)) : allRows;
  const totals = rows.reduce((sum, row) => ({ views: sum.views + Number(row.views), likes: sum.likes + Number(row.likes), comments: sum.comments + Number(row.comments), orders: sum.orders + Number(row.orders) }), { views: 0, likes: 0, comments: 0, orders: 0 });

  return <div className="creator-campaigns-page creator-performance-page">
    <header className="creator-page-heading creator-page-heading-wide"><p>캠페인 성과</p><h1>성과</h1><span>콘텐츠 반응과 주문 전환을 캠페인별로 확인하고 다음 제작 방향을 찾아보세요.</span></header>
    <section className="creator-performance-summary" aria-label="전체 성과"><article><span>전체 조회</span><strong>{number(totals.views)}</strong><small>게시 콘텐츠 누적</small></article><article><span>전체 반응</span><strong>{number(totals.likes + totals.comments)}</strong><small>좋아요와 댓글</small></article><article><span>전체 주문</span><strong>{number(totals.orders)}</strong><small>성과 입력 기준</small></article><article><span>평균 참여율</span><strong>{creatorRate(totals.likes + totals.comments, totals.views)}%</strong><small>전체 조회 대비 반응</small></article></section>
    {rows.length ? <div className="creator-performance-cards" aria-label="캠페인별 성과">{rows.map((row) => <article key={row.participation_id}><header><div><span>캠페인 성과</span><h2>{row.campaign_title}</h2></div><strong>{money(row.revenue, row.currency)}</strong></header><div className="creator-performance-card-metrics"><div><span>조회</span><strong>{number(row.views)}</strong></div><div><span>좋아요</span><strong>{number(row.likes)}</strong></div><div><span>댓글</span><strong>{number(row.comments)}</strong></div><div><span>주문</span><strong>{number(row.orders)}</strong></div></div><div className="creator-performance-rates"><div><span>참여율</span><strong>{creatorRate(row.likes + row.comments, row.views)}%</strong></div><div><span>주문 전환율</span><strong>{creatorRate(row.orders, row.views)}%</strong></div></div><footer><span>매출은 {row.currency} 통화로만 표시됩니다.</span><Link href={`/dashboard/creator/my-campaigns/${row.participation_id}`}>성과 입력·미션 보기</Link></footer></article>)}</div> : <div className="creator-empty-state"><h2>아직 집계된 성과가 없습니다.</h2><p>콘텐츠 게시 후 조회·주문 데이터를 입력하면 캠페인별 분석이 표시됩니다.</p><Link href="/dashboard/creator/my-campaigns">내 미션 확인</Link></div>}
  </div>;
}
