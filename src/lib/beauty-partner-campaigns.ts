import { hasDatabase, query, withDatabaseTransaction } from "./db";
import type { DatabaseTransactionClient } from "./db";
import {
  assertValidCampaignInput,
  canTransitionCampaignStatus,
  canTransitionParticipation,
  CAPACITY_OCCUPYING_PARTICIPATION_STATUSES,
  normalizeCampaignRewardText,
  participationConsumesCampaignCapacity,
  resolveCampaignOperatorParticipationAction,
} from "./creator-campaigns";
import type {
  AdminCampaignStatus,
  AdminParticipationAction,
  BeautyCampaignInput,
  Campaign,
  CampaignParticipation,
  ContentSubmission,
  ParticipationStatus,
  SettlementStatus,
  SubmissionStatus,
} from "./types";

export type BeautyCampaignParticipant = CampaignParticipation & {
  creator_display_name: string;
  creator_platform: string;
  creator_market: string;
};

export type BeautyCampaignOverview = Campaign & {
  product_name: string | null;
  product_image_url: string | null;
  application_count: number;
  occupied_count: number;
  participants: BeautyCampaignParticipant[];
};

export type BeautyContentRow = ContentSubmission & {
  campaign_id: string;
  campaign_title: string;
  product_name: string | null;
  participation_status: ParticipationStatus;
  creator_display_name: string;
  creator_platform: string;
  is_latest: boolean;
};

export type BeautyOrderRow = CampaignParticipation & {
  campaign_title: string;
  product_name: string | null;
  creator_display_name: string;
  creator_platform: string;
  creator_market: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  orders: number | null;
  revenue: number | null;
  currency: string | null;
  performance_updated_at: string | null;
};

export type BeautySettlementRow = Pick<CampaignParticipation, "id" | "campaign_id" | "status" | "expected_reward" | "settlement_status" | "updated_at"> & {
  campaign_title: string;
  creator_display_name: string;
};

async function lockBeautyPartner(client: DatabaseTransactionClient, designerId: string, actorUserId: string) {
  const result = await client.query<{ id: string; user_id: string | null }>(
    "SELECT id, user_id FROM designers WHERE id = $1 AND user_id = $2 AND approval_status = 'approved' FOR UPDATE",
    [designerId, actorUserId],
  );
  if (!result.rows[0]) throw new Error("Beauty partner access is required.");
  return result.rows[0];
}

async function lockOwnedProduct(client: DatabaseTransactionClient, productId: string, designerId: string) {
  const result = await client.query<{ id: string; designer_id: string; status: string }>(
    "SELECT id, designer_id, status FROM products WHERE id = $1 AND designer_id = $2 AND status = 'active' AND approval_status = 'approved' FOR SHARE",
    [productId, designerId],
  );
  if (!result.rows[0]) throw new Error("An owned product was not found.");
  return result.rows[0];
}

async function occupiedSlots(client: DatabaseTransactionClient, campaignId: string) {
  const result = await client.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM campaign_participations WHERE campaign_id = $1 AND status = ANY($2::text[])",
    [campaignId, CAPACITY_OCCUPYING_PARTICIPATION_STATUSES],
  );
  return Number(result.rows[0]?.count || 0);
}

export async function listBeautyPartnerCampaigns(designerId: string): Promise<BeautyCampaignOverview[]> {
  if (!hasDatabase()) return [];
  const [campaigns, participants] = await Promise.all([
    query<Omit<BeautyCampaignOverview, "participants">>(
      `SELECT campaign.*, product.name AS product_name, product.image_url AS product_image_url,
              COUNT(participation.id) FILTER (WHERE participation.source = 'application')::int AS application_count,
              COUNT(participation.id) FILTER (WHERE participation.status = ANY($2::text[]))::int AS occupied_count
         FROM campaigns campaign
         LEFT JOIN products product ON product.id = campaign.product_id AND product.designer_id = $1
         LEFT JOIN campaign_participations participation ON participation.campaign_id = campaign.id
        WHERE campaign.owner_type = 'designer' AND campaign.designer_id = $1
        GROUP BY campaign.id, product.id
        ORDER BY campaign.created_at DESC`,
      [designerId, CAPACITY_OCCUPYING_PARTICIPATION_STATUSES],
    ),
    query<BeautyCampaignParticipant & { campaign_id: string }>(
      `SELECT participation.*, creator.display_name AS creator_display_name,
              creator.platform AS creator_platform, creator.market AS creator_market
         FROM campaign_participations participation
         JOIN campaigns campaign ON campaign.id = participation.campaign_id
         JOIN creator_accounts creator ON creator.id = participation.creator_account_id
        WHERE campaign.owner_type = 'designer' AND campaign.designer_id = $1
        ORDER BY participation.updated_at DESC`,
      [designerId],
    ),
  ]);
  const byCampaign = new Map<string, BeautyCampaignParticipant[]>();
  for (const participant of participants) {
    byCampaign.set(participant.campaign_id, [...(byCampaign.get(participant.campaign_id) ?? []), participant]);
  }
  return campaigns.map((campaign) => ({ ...campaign, participants: byCampaign.get(campaign.id) ?? [] }));
}

export async function listBeautyPartnerContent(designerId: string): Promise<BeautyContentRow[]> {
  if (!hasDatabase()) return [];
  return query<BeautyContentRow>(
    `SELECT submission.*, campaign.id AS campaign_id, campaign.title AS campaign_title,
            product.name AS product_name, participation.status AS participation_status,
            creator.display_name AS creator_display_name, creator.platform AS creator_platform,
            NOT EXISTS (
              SELECT 1 FROM content_submissions newer
              WHERE newer.participation_id = submission.participation_id
                AND newer.version > submission.version
            ) AS is_latest
       FROM content_submissions submission
       JOIN campaign_participations participation ON participation.id = submission.participation_id
       JOIN campaigns campaign ON campaign.id = participation.campaign_id
       JOIN creator_accounts creator ON creator.id = participation.creator_account_id
       LEFT JOIN products product ON product.id = campaign.product_id AND product.designer_id = $1
      WHERE campaign.owner_type = 'designer' AND campaign.designer_id = $1
      ORDER BY submission.submitted_at DESC, submission.version DESC`,
    [designerId],
  );
}

export async function listBeautyPartnerOrders(designerId: string): Promise<BeautyOrderRow[]> {
  if (!hasDatabase()) return [];
  return query<BeautyOrderRow>(
    `SELECT participation.*, campaign.title AS campaign_title, product.name AS product_name,
            creator.display_name AS creator_display_name, creator.platform AS creator_platform,
            creator.market AS creator_market, performance.views, performance.likes,
            performance.comments, performance.orders, performance.revenue, performance.currency,
            performance.updated_at AS performance_updated_at
       FROM campaign_participations participation
       JOIN campaigns campaign ON campaign.id = participation.campaign_id
       JOIN creator_accounts creator ON creator.id = participation.creator_account_id
       LEFT JOIN products product ON product.id = campaign.product_id AND product.designer_id = $1
       LEFT JOIN campaign_performance performance ON performance.participation_id = participation.id
      WHERE campaign.owner_type = 'designer' AND campaign.designer_id = $1
      ORDER BY participation.updated_at DESC`,
    [designerId],
  );
}

export async function listBeautyPartnerSettlements(designerId: string): Promise<BeautySettlementRow[]> {
  if (!hasDatabase()) return [];
  return query<BeautySettlementRow>(
    `SELECT participation.id, participation.campaign_id, participation.status,
            participation.expected_reward, participation.settlement_status, participation.updated_at,
            campaign.title AS campaign_title, creator.display_name AS creator_display_name
       FROM campaign_participations participation
       JOIN campaigns campaign ON campaign.id = participation.campaign_id
       JOIN creator_accounts creator ON creator.id = participation.creator_account_id
      WHERE campaign.owner_type = 'designer'
        AND campaign.designer_id = $1
        AND participation.status = ANY($2::text[])
      ORDER BY participation.updated_at DESC`,
    [designerId, CAPACITY_OCCUPYING_PARTICIPATION_STATUSES],
  );
}

export async function createBeautyPartnerCampaign(designerId: string, actorUserId: string, input: BeautyCampaignInput): Promise<Campaign> {
  assertValidCampaignInput(input);
  const rewardText = normalizeCampaignRewardText(input.reward_text);
  return withDatabaseTransaction(async (client) => {
    await lockBeautyPartner(client, designerId, actorUserId);
    await lockOwnedProduct(client, input.product_id, designerId);
    const result = await client.query<Campaign>(
      `INSERT INTO campaigns
         (owner_type, owner_id, designer_id, product_id, title, category, markets, platforms, brief,
          reward_text, application_deadline, content_deadline, slots, image_urls)
       VALUES ('designer', $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13::jsonb)
       RETURNING *`,
      [actorUserId, designerId, input.product_id, input.title.trim(), input.category.trim(), JSON.stringify(input.markets), JSON.stringify(input.platforms), input.brief.trim(), rewardText, input.application_deadline, input.content_deadline, input.slots, JSON.stringify(input.image_urls ?? [])],
    );
    const campaign = result.rows[0];
    if (!campaign) throw new Error("Campaign could not be created.");
    return campaign;
  });
}

export async function updateBeautyPartnerCampaign(designerId: string, actorUserId: string, campaignId: string, input: Partial<BeautyCampaignInput>): Promise<Campaign> {
  return withDatabaseTransaction(async (client) => {
    await lockBeautyPartner(client, designerId, actorUserId);
    const currentResult = await client.query<Campaign>(
      "SELECT * FROM campaigns WHERE id = $1 AND owner_type = 'designer' AND designer_id = $2 FOR UPDATE",
      [campaignId, designerId],
    );
    const current = currentResult.rows[0];
    if (!current) throw new Error("Campaign was not found.");
    if (current.status !== "draft" && current.status !== "recruiting") throw new Error("Only draft or recruiting campaigns can be edited.");
    const productId = input.product_id ?? current.product_id;
    if (!productId) throw new Error("An owned product is required.");
    await lockOwnedProduct(client, productId, designerId);
    const next = { ...current, ...input, product_id: productId, image_urls: input.image_urls ?? current.image_urls };
    assertValidCampaignInput(next);
    if (next.slots < current.slots && next.slots < await occupiedSlots(client, campaignId)) {
      throw new Error("Campaign slots cannot be reduced below occupied capacity.");
    }
    const result = await client.query<Campaign>(
      `UPDATE campaigns
          SET product_id = $4, title = $5, category = $6, markets = $7::jsonb, platforms = $8::jsonb,
              brief = $9, reward_text = $10, application_deadline = $11, content_deadline = $12,
              slots = $13, image_urls = $14::jsonb, updated_at = now()
        WHERE id = $1 AND owner_type = 'designer' AND designer_id = $2 AND owner_id = $3
        RETURNING *`,
      [campaignId, designerId, actorUserId, productId, next.title.trim(), next.category.trim(), JSON.stringify(next.markets), JSON.stringify(next.platforms), next.brief.trim(), normalizeCampaignRewardText(next.reward_text), next.application_deadline, next.content_deadline, next.slots, JSON.stringify(next.image_urls ?? [])],
    );
    const campaign = result.rows[0];
    if (!campaign) throw new Error("Campaign was not found.");
    return campaign;
  });
}

export async function setBeautyPartnerCampaignStatus(designerId: string, actorUserId: string, campaignId: string, status: AdminCampaignStatus): Promise<Campaign> {
  return withDatabaseTransaction(async (client) => {
    await lockBeautyPartner(client, designerId, actorUserId);
    const currentResult = await client.query<Campaign>(
      "SELECT * FROM campaigns WHERE id = $1 AND owner_type = 'designer' AND designer_id = $2 FOR UPDATE",
      [campaignId, designerId],
    );
    const current = currentResult.rows[0];
    if (!current) throw new Error("Campaign was not found.");
    if (!canTransitionCampaignStatus(current.status, status)) throw new Error(`Cannot transition campaign from ${current.status} to ${status}.`);
    if (status === "recruiting") {
      if (!current.product_id) throw new Error("An owned product is required.");
      await lockOwnedProduct(client, current.product_id, designerId);
    }
    const result = await client.query<Campaign>(
      "UPDATE campaigns SET status = $4, updated_at = now() WHERE id = $1 AND owner_type = 'designer' AND designer_id = $2 AND owner_id = $3 RETURNING *",
      [campaignId, designerId, actorUserId, status],
    );
    const campaign = result.rows[0];
    if (!campaign) throw new Error("Campaign was not found.");
    return campaign;
  });
}

function assertParticipationTransition(fromStatus: ParticipationStatus, toStatus: ParticipationStatus) {
  if (!canTransitionParticipation(fromStatus, toStatus)) {
    throw new Error(`Cannot transition participation from ${fromStatus} to ${toStatus}.`);
  }
}

async function lockLatestOwnedSubmission(
  client: DatabaseTransactionClient,
  submissionId: string,
  participationId: string,
  designerId: string,
) {
  const result = await client.query<Pick<ContentSubmission, "id" | "participation_id" | "version" | "status">>(
    `SELECT submission.id, submission.participation_id, submission.version, submission.status
       FROM content_submissions submission
       JOIN campaign_participations participation ON participation.id = submission.participation_id
       JOIN campaigns campaign ON campaign.id = participation.campaign_id
      WHERE submission.id = $1
        AND submission.participation_id = $2
        AND campaign.owner_type = 'designer'
        AND campaign.designer_id = $3
        AND NOT EXISTS (
          SELECT 1 FROM content_submissions newer
          WHERE newer.participation_id = submission.participation_id
            AND newer.version > submission.version
        )
      FOR UPDATE OF submission`,
    [submissionId, participationId, designerId],
  );
  const submission = result.rows[0];
  if (!submission) throw new Error("The latest content submission was not found.");
  return submission;
}

async function recordReviewDecision(client: DatabaseTransactionClient, submissionId: string, participationId: string, toStatus: ParticipationStatus, note: string) {
  if (toStatus !== "creating" && toStatus !== "published") return;
  if (toStatus === "creating" && !note) throw new Error("A revision note is required.");
  const submissionStatus: SubmissionStatus = toStatus === "creating" ? "revision_requested" : "approved";
  const result = await client.query<{ id: string }>(
    `UPDATE content_submissions
        SET status = '${submissionStatus}', review_note = $2, reviewed_at = now()
      WHERE id = $1 AND participation_id = $3
      RETURNING id`,
    [submissionId, note, participationId],
  );
  if (!result.rows[0]) throw new Error("The latest content submission was not found.");
}

export async function transitionBeautyPartnerParticipation(
  designerId: string,
  actorUserId: string,
  participationId: string,
  action: AdminParticipationAction,
  note = "",
  submissionId?: string,
): Promise<CampaignParticipation> {
  return withDatabaseTransaction(async (client) => {
    await lockBeautyPartner(client, designerId, actorUserId);
    const currentResult = await client.query<CampaignParticipation>(
      `SELECT participation.*
         FROM campaign_participations participation
         JOIN campaigns campaign ON campaign.id = participation.campaign_id
        WHERE participation.id = $1
          AND campaign.owner_type = 'designer'
          AND campaign.designer_id = $2
        FOR UPDATE OF participation`,
      [participationId, designerId],
    );
    const current = currentResult.rows[0];
    if (!current) throw new Error("Campaign participation was not found.");
    const campaignResult = await client.query<Campaign>(
      "SELECT * FROM campaigns WHERE id = $1 AND owner_type = 'designer' AND designer_id = $2 FOR UPDATE",
      [current.campaign_id, designerId],
    );
    const campaign = campaignResult.rows[0];
    if (!campaign) throw new Error("Campaign was not found.");
    const nextStatus = resolveCampaignOperatorParticipationAction(current.status, action);
    assertParticipationTransition(current.status, nextStatus);
    const isContentReviewDecision = current.status === "review" && (nextStatus === "creating" || nextStatus === "published");
    if (isContentReviewDecision) {
      if (!submissionId) throw new Error("The latest content submission was not found.");
      await lockLatestOwnedSubmission(client, submissionId, participationId, designerId);
    }
    if (!participationConsumesCampaignCapacity(current.status) && participationConsumesCampaignCapacity(nextStatus)) {
      if (await occupiedSlots(client, current.campaign_id) >= campaign.slots) throw new Error("Campaign is at capacity.");
    }
    const result = await client.query<CampaignParticipation>(
      "UPDATE campaign_participations SET status = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [participationId, nextStatus],
    );
    const updated = result.rows[0];
    if (!updated) throw new Error("Campaign participation was not found.");
    if (isContentReviewDecision && submissionId) {
      await recordReviewDecision(client, submissionId, participationId, nextStatus, note.trim());
    }
    await client.query(
      `INSERT INTO campaign_events (participation_id, actor_user_id, event_type, from_status, to_status, message)
       VALUES ($1, $2, 'partner_status_changed', $3, $4, $5)`,
      [participationId, actorUserId, current.status, nextStatus, note.trim() || `Status changed to ${nextStatus}.`],
    );
    return updated;
  });
}

export const BEAUTY_SETTLEMENT_STATUSES: SettlementStatus[] = ["none", "pending", "confirmed", "paid"];
