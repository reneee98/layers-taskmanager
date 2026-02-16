-- Allow accepting workspace invitations while keeping protection against unauthorized inserts.
-- Existing trigger only allows workspace owners to insert into workspace_members.
-- Invitation acceptance runs as invited user (or service role backend), so it must be allowed.

CREATE OR REPLACE FUNCTION prevent_unauthorized_workspace_member_addition()
RETURNS TRIGGER AS $$
DECLARE
  request_user_id UUID := auth.uid();
  request_role TEXT := auth.role();
BEGIN
  -- Backend service role can manage inserts.
  IF request_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Workspace owner can add members.
  IF EXISTS (
    SELECT 1
    FROM workspaces
    WHERE id = NEW.workspace_id
      AND owner_id = request_user_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Allow membership creation when there is a valid pending invitation
  -- for the same user/workspace pair (covers server-side accept flow too).
  IF EXISTS (
    SELECT 1
    FROM workspace_invitations wi
    JOIN profiles p ON p.id = NEW.user_id
    WHERE wi.workspace_id = NEW.workspace_id
      AND wi.status = 'pending'
      AND wi.expires_at > NOW()
      AND LOWER(wi.email) = LOWER(COALESCE(p.email, ''))
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Unauthorized attempt to add user to workspace: User % attempted to add user % to workspace % without being owner',
    request_user_id,
    NEW.user_id,
    NEW.workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
