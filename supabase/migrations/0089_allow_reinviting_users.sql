-- Migration: Allow re-inviting users
-- The unique constraint on workspace_invitations (workspace_id, email) blocked
-- inviting anyone who had EVER been invited before (even accepted/declined/expired
-- invitations), so a removed member could never be invited back.
-- Replace it with a partial unique index that only prevents duplicate PENDING invitations.

ALTER TABLE workspace_invitations
  DROP CONSTRAINT IF EXISTS workspace_invitations_workspace_id_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_pending_unique
  ON workspace_invitations (workspace_id, lower(email))
  WHERE status = 'pending';
