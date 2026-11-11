import Link from "next/link";
import BeautyCampaignForm from "@/components/BeautyCampaignForm";
import type { BeautyCampaignFormValue } from "@/components/BeautyCampaignForm";
import { BeautyCampaignStatusActions, BeautyParticipationActions } from "@/components/BeautyCampaignActions";
import { campaignStatusLabel, formatCampaignDeadline, participationSourceLabel, participationStatusLabel } from "@/lib/admin-campaign";
import { requireBeautyPartner } from "@/lib/auth";
import { listBeautyPartnerCampaigns } from "@/lib/beauty-partner-campaigns";
import { getProductsForDesigner } from "@/lib/db";

export default async function BeautyCampaignsPage() {
  const { designer } = await requireBeautyPartner();
  const [campaigns, products] = await Promise.all([
    listBeautyPartnerCampaigns(designer.id),
    getProductsForDesigner(designer.id),
  ]);
  const campaignProducts = products
    .filter((product) => product.status === "active" && product.approval_status === "approved")
    .map(({ id, name, category }) => ({ id, name, category }));

  const campaignFormValue = (campaign: typeof campaigns[number]): BeautyCampaignFormValue => ({
    id: campaign.id,
    product_id: campaign.product_id,
    title: campaign.title,
    category: campaign.category,
    markets: campaign.markets,
    platforms: campaign.platforms,
    brief: campaign.brief,
    reward_text: campaign.reward_text,
    slots: campaign.slots,
    application_deadline: campaign.application_deadline ? new Date(campaign.application_deadline).toISOString() : null,
    content_deadline: campaign.content_deadline ? new Date(campaign.content_deadline).toISOString() : null,
    image_urls: campaign.image_urls,
  });

  return <div className="beauty-operations-page">
    <header className="beauty-page-heading"><p>K-MODU CREATOR CAMPAIGN</p><h1>캠페인·매칭</h1><span>내 상품으로 캠페인을 만들고 신청부터 배송·제작·정산까지 현재 단계에 맞춰 운영하세요.</span></header>

    {campaignProducts.length ? <details className="beauty-create-panel" open={!campaigns.length}>
      <summary><span><b>새 상품 캠페인</b><small>먼저 초안으로 저장한 뒤 준비가 끝나면 모집을 시작합니다.</small></span><i>+</i></summary>
      <BeautyCampaignForm products={campaignProducts} />
    </details> : <section className="beauty-empty-state"><h2>캠페인에 연결할 상품이 없습니다.</h2><p>상품을 먼저 등록하면 해당 상품을 기준으로 크리에이터 모집 캠페인을 만들 수 있습니다.</p><Link className="beauty-action primary" href="/dashboard/beauty/products">상품 등록하기</Link></section>}

    {campaigns.length ? <section className="beauty-campaign-list" aria-label="브랜드 캠페인 목록">{campaigns.map((campaign) => <article className="beauty-campaign-card" key={campaign.id}>
      <header><div><span>{campaign.product_name || "연결 상품 확인 필요"}</span><h2>{campaign.title}</h2><p>{campaign.category} · {campaign.markets.join(", ")} · {campaign.platforms.join(", ")}</p></div><b className={`beauty-status is-${campaign.status}`}>{campaignStatusLabel(campaign.status)}</b></header>
      <p className="beauty-campaign-brief">{campaign.brief}</p>
      <dl className="beauty-metric-row"><div><dt>신청</dt><dd>{campaign.application_count}</dd></div><div><dt>확정 참여</dt><dd>{campaign.occupied_count}/{campaign.slots}</dd></div><div><dt>리워드</dt><dd>{campaign.reward_text}</dd></div><div><dt>신청 마감</dt><dd>{formatCampaignDeadline(campaign.application_deadline)}</dd></div></dl>
      <BeautyCampaignStatusActions campaignId={campaign.id} status={campaign.status} />
      {(campaign.status === "draft" || campaign.status === "recruiting") ? <details className="beauty-edit-panel"><summary>캠페인 정보 수정</summary><BeautyCampaignForm campaign={campaignFormValue(campaign)} products={campaignProducts} /></details> : null}
      <section className="beauty-participant-section"><div className="beauty-subheading"><h3>신청·참여 현황</h3><span>{campaign.participants.length}명</span></div>
        {campaign.participants.length ? <div className="beauty-participant-list">{campaign.participants.map((participant) => <article key={participant.id}><div><strong>{participant.creator_display_name}</strong><span>{participant.creator_platform || "플랫폼 미등록"} · {participant.creator_market || "시장 미등록"} · {participationSourceLabel(participant.source)}</span></div><b className={`beauty-status is-${participant.status}`}>{participationStatusLabel(participant.status)}</b>{participant.status !== "review" ? <BeautyParticipationActions participationId={participant.id} status={participant.status} /> : <Link className="beauty-action" href="/dashboard/beauty/content">최신 제출물에서 검수</Link>}</article>)}</div> : <div className="beauty-empty-inline"><p>아직 신청한 크리에이터가 없습니다.</p><span>모집을 시작하면 타깃 조건에 맞는 크리에이터 센터에 캠페인이 노출됩니다.</span></div>}
      </section>
    </article>)}</section> : campaignProducts.length ? <section className="beauty-empty-state"><h2>아직 만든 캠페인이 없습니다.</h2><p>위의 새 상품 캠페인을 열어 첫 캠페인 초안을 만들어 보세요.</p></section> : null}
  </div>;
}
