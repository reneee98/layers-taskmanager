-- Migration: Fix is_workspace_member ambiguous column reference
-- The production DB still had the 0009 version of is_workspace_member whose
-- parameter names (workspace_id, user_id) collide with the column names in
-- workspace_members, causing error 42702 ("column reference is ambiguous")
-- in every RLS policy that calls it (tags, task_tags, task_watchers, ...).
-- 0068 intended to fix this by renaming parameters, but CREATE OR REPLACE
-- cannot rename parameters, so this version keeps the original names and
-- fully qualifies the references instead.

CREATE OR REPLACE FUNCTION is_workspace_member(workspace_id UUID, user_id UUID)
RETURNS BOOLEAN AS $fn$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = is_workspace_member.workspace_id
      AND wm.user_id = is_workspace_member.user_id
  );
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
