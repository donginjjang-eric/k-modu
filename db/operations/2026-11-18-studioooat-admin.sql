-- 요청된 기존 계정에 한 번만 관리자 역할과 작업공간을 부여합니다.
DO $operation$
DECLARE
  grant_id constant text := '2026-11-18-studioooat-admin';
  target_email constant text := 'studioooat@gmail.com';
  target_user users%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(32706, 20261118);

  CREATE TABLE IF NOT EXISTS kmodu_applied_account_operations (
    operation_name text PRIMARY KEY,
    user_id text NOT NULL,
    previous_role text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  );

  IF EXISTS (SELECT 1 FROM kmodu_applied_account_operations WHERE operation_name = grant_id) THEN
    RETURN;
  END IF;

  SELECT * INTO STRICT target_user
    FROM users
   WHERE lower(email) = target_email
   FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1
      FROM user_workspace_memberships membership
      JOIN creator_accounts creator ON creator.id = membership.resource_id
     WHERE membership.user_id = target_user.id AND membership.workspace_type = 'creator'
       AND membership.status = 'active' AND creator.user_id = target_user.id
       AND creator.approval_status = 'approved'
  ) OR NOT EXISTS (
    SELECT 1
      FROM user_workspace_memberships membership
      JOIN designers brand ON brand.id = membership.resource_id
     WHERE membership.user_id = target_user.id AND membership.workspace_type = 'beauty_partner'
       AND membership.status = 'active' AND brand.user_id = target_user.id
       AND brand.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'The target account must have an active creator and beauty connection';
  END IF;

  UPDATE users SET role = 'admin', updated_at = now()
   WHERE id = target_user.id AND role <> 'admin';

  INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
  VALUES (target_user.id, 'admin', NULL, 'active', false)
  ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO UPDATE
    SET status = 'active', is_default = false, updated_at = now()
  WHERE user_workspace_memberships.status <> 'active';

  IF NOT EXISTS (
    SELECT 1 FROM users account
      JOIN user_workspace_memberships membership ON membership.user_id = account.id
     WHERE account.id = target_user.id AND account.role = 'admin'
       AND membership.workspace_type = 'admin' AND membership.resource_id IS NULL
       AND membership.status = 'active'
  ) THEN
    RAISE EXCEPTION 'The administrator role and active workspace could not be verified';
  END IF;

  INSERT INTO kmodu_applied_account_operations (operation_name, user_id, previous_role)
  VALUES (grant_id, target_user.id, target_user.role);
END
$operation$;
