import { one, query, withDatabaseTransaction } from "./db";
import type { UserWorkspaceMembership, WorkspaceType } from "./types";

export type ResolvedWorkspace = UserWorkspaceMembership & {
  brand_category: string | null;
  brand_name: string | null;
  designer_user_id: string | null;
};

const fashionCategories = new Set(["k-패션", "패션", "k-fashion", "fashion", "미분류"]);
const beautyCategories = new Set(["k-뷰티", "뷰티", "k-beauty", "beauty"]);
const hybridCategories = new Set(["복합", "하이브리드", "hybrid", "both"]);

function normalizedCategory(category: unknown) {
  return typeof category === "string" ? category.trim().toLowerCase() : "";
}

export function partnerWorkspaceTypes(category: unknown): WorkspaceType[] {
  const normalized = normalizedCategory(category);
  if (hybridCategories.has(normalized)) return ["fashion_partner", "beauty_partner"];
  if (fashionCategories.has(normalized)) return ["fashion_partner"];
  if (beautyCategories.has(normalized)) return ["beauty_partner"];
  return [];
}

export function partnerWorkspaceType(category: unknown): WorkspaceType | null {
  return partnerWorkspaceTypes(category)[0] ?? null;
}

export function isWorkspaceCandidateAllowed(
  candidate: ResolvedWorkspace,
  input: { userId: string; workspaceType: WorkspaceType; requireActive?: boolean },
) {
  if (candidate.user_id !== input.userId || candidate.workspace_type !== input.workspaceType) return false;
  if (input.requireActive !== false && candidate.status !== "active") return false;

  if (input.workspaceType === "fashion_partner" || input.workspaceType === "beauty_partner") {
    if (!candidate.resource_id) return false;
    if (candidate.designer_user_id !== candidate.user_id) return false;
    return partnerWorkspaceTypes(candidate.brand_category).includes(input.workspaceType);
  }

  return true;
}

const workspaceSelect = `
  SELECT memberships.*,
         CASE
           WHEN memberships.workspace_type IN ('fashion_partner', 'beauty_partner')
             THEN designers.brand_category
           ELSE NULL
         END AS brand_category,
         designers.user_id AS designer_user_id,
         designers.brand_name AS brand_name
    FROM user_workspace_memberships memberships
    LEFT JOIN designers
      ON designers.id = memberships.resource_id
     AND designers.user_id = memberships.user_id
     AND memberships.workspace_type IN ('fashion_partner', 'beauty_partner')`;

export async function listUserWorkspaces(userId: string): Promise<ResolvedWorkspace[]> {
  const rows = await query<ResolvedWorkspace>(
    `${workspaceSelect}
      WHERE memberships.user_id = $1
      ORDER BY memberships.is_default DESC, memberships.created_at ASC`,
    [userId],
  );

  return rows.filter((candidate) =>
    isWorkspaceCandidateAllowed(candidate, {
      userId,
      workspaceType: candidate.workspace_type,
      requireActive: false,
    }),
  );
}

export async function resolveUserWorkspace(input: {
  userId: string;
  workspaceType: WorkspaceType;
  membershipId?: string | null;
  requireActive?: boolean;
}): Promise<ResolvedWorkspace | null> {
  const membership = await one<ResolvedWorkspace>(
    `${workspaceSelect}
      WHERE memberships.user_id = $1
        AND memberships.workspace_type = $2
        AND ($3::text IS NULL OR memberships.id = $3)
      ORDER BY memberships.is_default DESC, memberships.created_at ASC
      LIMIT 1`,
    [input.userId, input.workspaceType, input.membershipId ?? null],
  );

  if (!membership) return null;
  return isWorkspaceCandidateAllowed(membership, input) ? membership : null;
}

export async function backfillWorkspaceMemberships(): Promise<void> {
  await withDatabaseTransaction(async (client) => {
    await client.query(`
      INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
      SELECT id, 'admin', NULL, 'active', role = 'admin'
        FROM users
       WHERE role = 'admin'
      ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING`);

    await client.query(`
      INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
      SELECT user_id, 'creator', id,
             CASE approval_status WHEN 'approved' THEN 'active' WHEN 'disabled' THEN 'disabled' ELSE 'pending' END,
             false
        FROM creator_accounts
       WHERE user_id IS NOT NULL
      ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING`);

    await client.query(`
      INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
      SELECT designers.user_id, workspace_types.workspace_type, designers.id,
             CASE designers.approval_status
               WHEN 'approved' THEN 'active'
               WHEN 'disabled' THEN 'disabled'
               WHEN 'rejected' THEN 'rejected'
               ELSE 'pending'
             END,
             false
        FROM designers
        CROSS JOIN LATERAL (
          SELECT 'fashion_partner'::text AS workspace_type
           WHERE lower(trim(designers.brand_category)) IN ('k-패션', '패션', 'k-fashion', 'fashion', '미분류', '복합', '하이브리드', 'hybrid', 'both')
          UNION ALL
          SELECT 'beauty_partner'::text AS workspace_type
           WHERE lower(trim(designers.brand_category)) IN ('k-뷰티', '뷰티', 'k-beauty', 'beauty', '복합', '하이브리드', 'hybrid', 'both')
        ) workspace_types
       WHERE designers.user_id IS NOT NULL
      ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING`);

    await client.query(`
      INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
      SELECT user_id, 'agency', group_id,
             CASE invite_status WHEN 'active' THEN 'active' WHEN 'revoked' THEN 'disabled' ELSE 'pending' END,
             false
        FROM creator_management_group_users
       WHERE user_id IS NOT NULL
      ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING`);
  });
}

export async function backfillUserWorkspaceMemberships(userId: string, requestedType?: WorkspaceType): Promise<void> {
  await withDatabaseTransaction(async (client) => {
    if (!requestedType || requestedType === "admin") {
      await client.query(`
        INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
        SELECT id, 'admin', NULL, 'active', role = 'admin'
          FROM users
         WHERE id = $1 AND role = 'admin'
        ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING`, [userId]);
    }

    if (!requestedType || requestedType === "creator") {
      await client.query(`
        INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
        SELECT user_id, 'creator', id,
               CASE approval_status WHEN 'approved' THEN 'active' WHEN 'disabled' THEN 'disabled' ELSE 'pending' END,
               false
          FROM creator_accounts
         WHERE user_id = $1
        ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING`, [userId]);
    }

    if (!requestedType || requestedType === "fashion_partner" || requestedType === "beauty_partner") {
      await client.query(`
        INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
        SELECT designers.user_id, workspace_types.workspace_type, designers.id,
               CASE designers.approval_status
                 WHEN 'approved' THEN 'active'
                 WHEN 'disabled' THEN 'disabled'
                 WHEN 'rejected' THEN 'rejected'
                 ELSE 'pending'
               END,
               false
          FROM designers
          CROSS JOIN LATERAL (
            SELECT 'fashion_partner'::text AS workspace_type
             WHERE lower(trim(designers.brand_category)) IN ('k-패션', '패션', 'k-fashion', 'fashion', '미분류', '복합', '하이브리드', 'hybrid', 'both')
            UNION ALL
            SELECT 'beauty_partner'::text AS workspace_type
             WHERE lower(trim(designers.brand_category)) IN ('k-뷰티', '뷰티', 'k-beauty', 'beauty', '복합', '하이브리드', 'hybrid', 'both')
          ) workspace_types
         WHERE designers.user_id = $1
           AND ($2::text IS NULL OR workspace_types.workspace_type = $2)
        ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING`, [userId, requestedType ?? null]);
    }

    if (!requestedType || requestedType === "agency") {
      await client.query(`
        INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
        SELECT user_id, 'agency', group_id,
               CASE invite_status WHEN 'active' THEN 'active' WHEN 'revoked' THEN 'disabled' ELSE 'pending' END,
               false
          FROM creator_management_group_users
         WHERE user_id = $1
        ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING`, [userId]);
    }
  });
}
