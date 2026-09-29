import "../data/malaysia-meeting-creators.js";
import "../data/malaysia-new-meeting-creators.js";
import "../data/vietnam-artists.js";

const FOLLOWERS_VERIFIED_AT = "2026-08-24T00:00:00+09:00";

function normalizedFollowerCount(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function categoriesFromDirection(direction) {
  return direction.split("·").map((category) => category.trim()).filter(Boolean);
}

export function toCreatorAccountImportRows(creators) {
  return creators.map((creator) => {
    const instagramFollowers = normalizedFollowerCount(creator.instagramFollowers);
    const tiktokFollowers = normalizedFollowerCount(creator.tiktokFollowers);

    return {
      creator_key: creator.slug,
      display_name: creator.name,
      user_id: null,
      google_email: "",
      approval_status: "approved",
      onboarding_source: "admin",
      claim_state: "unclaimed",
      platform: tiktokFollowers > instagramFollowers ? "TikTok" : "Instagram",
      market: creator.market ?? "Malaysia",
      categories: categoriesFromDirection(creator.direction),
      profile_image_url: creator.image,
      specialty: creator.direction,
      instagram_handle: creator.instagram,
      instagram_url: creator.instagramUrl,
      instagram_followers: instagramFollowers,
      tiktok_handle: creator.tiktok ?? null,
      tiktok_url: creator.tiktokUrl ?? null,
      tiktok_followers: tiktokFollowers,
      followers_verified_at: creator.followersVerifiedAt === undefined ? FOLLOWERS_VERIFIED_AT : creator.followersVerifiedAt,
    };
  });
}

export function malaysiaMeetingFollowerTotal(rows) {
  return rows.reduce(
    (total, row) => total + row.instagram_followers + row.tiktok_followers,
    0,
  );
}

export async function syncMalaysiaMeetingCreators(client, adminUserId) {
  const rows = toCreatorAccountImportRows([
    ...globalThis.KMODU_MALAYSIA_MEETING_CREATORS,
    ...globalThis.KMODU_MALAYSIA_NEW_MEETING_CREATORS,
    ...globalThis.KMODU_VIETNAM_ARTISTS,
  ]);

  for (const row of rows) {
    await client.query(
      `INSERT INTO creator_accounts
        (creator_key, display_name, user_id, google_email, approval_status, onboarding_source, claim_state, created_by_admin_id,
         platform, market, categories, profile_image_url, specialty, instagram_handle, instagram_url, instagram_followers,
         tiktok_handle, tiktok_url, tiktok_followers, followers_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (creator_key) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         approval_status = 'approved',
         platform = EXCLUDED.platform,
         market = EXCLUDED.market,
         categories = EXCLUDED.categories,
         profile_image_url = EXCLUDED.profile_image_url,
         specialty = EXCLUDED.specialty,
         instagram_handle = EXCLUDED.instagram_handle,
         instagram_url = EXCLUDED.instagram_url,
         instagram_followers = EXCLUDED.instagram_followers,
         tiktok_handle = EXCLUDED.tiktok_handle,
         tiktok_url = EXCLUDED.tiktok_url,
         tiktok_followers = EXCLUDED.tiktok_followers,
         followers_verified_at = EXCLUDED.followers_verified_at,
         updated_at = NOW()`,
      [
        row.creator_key,
        row.display_name,
        row.user_id,
        row.google_email,
        row.approval_status,
        row.onboarding_source,
        row.claim_state,
        adminUserId ?? null,
        row.platform,
        row.market,
        JSON.stringify(row.categories),
        row.profile_image_url,
        row.specialty,
        row.instagram_handle,
        row.instagram_url,
        row.instagram_followers,
        row.tiktok_handle,
        row.tiktok_url,
        row.tiktok_followers,
        row.followers_verified_at,
      ],
    );
  }
}
