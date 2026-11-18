import Link from "next/link";
import CreatorCampaignApplyButton from "@/components/CreatorCampaignApplyButton";
import { requireApprovedCreator } from "@/lib/auth";
import { getRecommendedCampaigns } from "@/lib/creator-campaigns";
import { campaignMatchesPersona, creatorPersona } from "@/lib/creator-persona";
import { creatorMatchReasonLabel, creatorStatusLabel } from "@/lib/creator-copy";

type SearchParams = Record<string, string | string[] | undefined>;

function selectedValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function imageForCategory(category: string) {
  const image = category.toLowerCase().includes("beauty") || category.toLowerCase().includes("skin")
    ? "campaign-kdesigner-02.png"
    : "campaign-kdesigner-01.png";
  return `/assets/${image}`;
}

function deadlineLabel(deadline: string | Date | null) {
  if (!deadline) return "상시 모집";
  if (deadline instanceof Date) return deadline.toISOString().slice(0, 10);
  return String(deadline).slice(0, 10);
}

export default async function CreatorCampaignsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { creator, isPreview } = await requireApprovedCreator();
  const filters = await searchParams;
  const category = selectedValue(filters.category);
  const market = selectedValue(filters.market);
  const platform = selectedValue(filters.platform);
  const persona = creatorPersona(filters.persona);
  const recommended = await getRecommendedCampaigns(creator.id);
  const personaCampaigns = isPreview ? recommended.filter((campaign) => campaignMatchesPersona(campaign.markets, persona)) : recommended;
  const campaigns = personaCampaigns.filter((campaign) => campaign.status === "recruiting")
    .filter((campaign) => !category || campaign.category === category)
    .filter((campaign) => !market || campaign.markets.includes(market))
    .filter((campaign) => !platform || campaign.platforms.includes(platform));
  const categories = [...new Set(personaCampaigns.map((campaign) => campaign.category))];
  const markets = [...new Set(personaCampaigns.flatMap((campaign) => campaign.markets))];
  const platforms = [...new Set(personaCampaigns.flatMap((campaign) => campaign.platforms))];

  return (
    <div className="creator-campaigns-page">
      <header className="creator-page-heading"><p>추천 캠페인</p><h1>내게 맞는 모집 캠페인</h1><span>활동 국가, 채널, 관심 분야를 내 프로필과 비교해 추천합니다.</span></header>
      <form className="creator-campaign-filters" action="/dashboard/creator/campaigns">
        {isPreview ? <input type="hidden" name="persona" value={persona} /> : null}
        <label>카테고리<select name="category" defaultValue={category}><option value="">전체 카테고리</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>활동 국가<select name="market" defaultValue={market}><option value="">전체 국가</option>{markets.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>활동 채널<select name="platform" defaultValue={platform}><option value="">전체 채널</option>{platforms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <button type="submit">조건 적용</button>
        <Link href="/dashboard/creator/campaigns">초기화</Link>
      </form>
      <p className="creator-result-count" aria-live="polite">모집 중인 캠페인 {campaigns.length}개</p>
      {campaigns.length ? <div className="creator-campaign-grid">{campaigns.map((campaign) => <article className="creator-campaign-card" key={campaign.id}>
        <img src={imageForCategory(campaign.category)} alt="" />
        <div className="creator-campaign-card-body"><div className="creator-card-kicker"><span>{campaign.category}</span><b>{creatorStatusLabel(campaign.status)}</b></div><h2>{campaign.title}</h2><p>{campaign.brief}</p><dl><div><dt>보상</dt><dd>{campaign.reward_text || "협의 후 안내"}</dd></div><div><dt>지원 마감</dt><dd>{campaign.application_deadline ? <time dateTime={campaign.application_deadline} data-i18n-date="medium">{deadlineLabel(campaign.application_deadline)}</time> : "상시 모집"}</dd></div><div><dt>모집 인원</dt><dd>{campaign.slots}명</dd></div></dl><div className="creator-match-tags" aria-label={`추천 점수 ${campaign.fit.score}점`}>{campaign.fit.reasons.map((reason) => <span key={reason}>{creatorMatchReasonLabel(reason)}</span>)}</div><CreatorCampaignApplyButton campaignId={campaign.id} /></div>
      </article>)}</div> : <div className="creator-empty-state"><h2>조건에 맞는 모집 캠페인이 없습니다.</h2><p>필터를 바꾸거나 나중에 다시 확인해 주세요.</p><Link href="/dashboard/creator/campaigns">필터 초기화</Link></div>}
    </div>
  );
}
