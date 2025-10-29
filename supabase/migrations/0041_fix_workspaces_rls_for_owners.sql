DROP POLICY IF EXISTS "Users can view accessible workspaces" ON workspaces;

DROP FUNCTION IF EXISTS user_has_workspace_access(UUID, UUID);
DROP FUNCTION IF EXISTS user_has_workspace_access(uuid, uuid);

CREATE OR REPLACE FUNCTION user_has_workspace_access(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view accessible workspaces" ON workspaces
  FOR SELECT USING (
    user_has_workspace_access(id, auth.uid())
  );
