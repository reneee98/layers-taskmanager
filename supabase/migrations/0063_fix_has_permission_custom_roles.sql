-- Migration: Fix has_permission function to properly handle custom roles
-- Purpose: Ensure that if a user has a custom role, only that role's permissions are checked
-- If custom role has no permissions, user should have NO permissions (not fall back to workspace_members.role)

CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
  v_has_custom_role BOOLEAN := FALSE;
BEGIN
  -- Check if user is admin (admins have all permissions)
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is workspace owner (owners have all permissions in their workspace)
  IF p_workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has a custom role in this workspace
  IF p_workspace_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = p_user_id
        AND ur.workspace_id = p_workspace_id
    ) INTO v_has_custom_role;
  END IF;
  
  -- If user has custom role, ONLY check custom role permissions (don't fall back to workspace_members.role)
  IF v_has_custom_role THEN
    SELECT EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = p_user_id
        AND ur.workspace_id = p_workspace_id
        AND p.resource = p_resource
        AND p.action = p_action
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
  END IF;
  
  -- If no custom role, check workspace_members role (system roles)
  IF p_workspace_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM workspace_members wm
      JOIN roles r ON r.name = wm.role
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE wm.user_id = p_user_id
        AND wm.workspace_id = p_workspace_id
        AND p.resource = p_resource
        AND p.action = p_action
    ) INTO v_has_permission;
  END IF;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION has_permission(UUID, TEXT, TEXT, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION has_permission IS 'Check if a user has a specific permission. Custom roles take precedence over system roles.';

