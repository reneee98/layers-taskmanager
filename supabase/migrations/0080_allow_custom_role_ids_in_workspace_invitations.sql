-- Allow workspace invitations to carry custom role IDs (UUID)
-- Existing flow stores system roles as text ("owner", "admin", "member")
-- and custom roles as roles.id UUID string.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspace_invitations_role_check'
  ) THEN
    ALTER TABLE workspace_invitations
      DROP CONSTRAINT workspace_invitations_role_check;
  END IF;
END $$;

ALTER TABLE workspace_invitations
  ADD CONSTRAINT workspace_invitations_role_check
  CHECK (
    role IN ('owner', 'admin', 'member')
    OR role ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );
