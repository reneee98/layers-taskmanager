-- Migration: User role management functions
-- Purpose: Allow workspace owners to change user roles

-- Create function to update user role in workspace
CREATE OR REPLACE FUNCTION update_user_workspace_role(
  p_workspace_id UUID,
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only workspace owners can change user roles'
    );
  END IF;
  
  -- Don't allow changing owner role
  IF EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot change workspace owner role'
    );
  END IF;
  
  -- Check if user is member of workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is not a member of this workspace'
    );
  END IF;
  
  -- Update user role
  UPDATE workspace_members 
  SET role = p_new_role, updated_at = NOW()
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User role updated successfully',
    'user_id', p_user_id,
    'new_role', p_new_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get workspace members with their roles
CREATE OR REPLACE FUNCTION get_workspace_members(p_workspace_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if current user has access to workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND (
      owner_id = auth.uid() OR
      id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Access denied to this workspace'
    );
  END IF;
  
  -- Get workspace members
  SELECT json_build_object(
    'success', true,
    'data', json_agg(
      json_build_object(
        'user_id', wm.user_id,
        'role', wm.role,
        'email', p.email,
        'display_name', p.display_name,
        'is_owner', (w.owner_id = wm.user_id),
        'joined_at', wm.created_at
      )
    )
  ) INTO result
  FROM workspace_members wm
  JOIN profiles p ON wm.user_id = p.id
  JOIN workspaces w ON wm.workspace_id = w.id
  WHERE wm.workspace_id = p_workspace_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add user to workspace with role
CREATE OR REPLACE FUNCTION add_user_to_workspace_with_role(
  p_workspace_id UUID,
  p_user_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSON AS $$
DECLARE
  target_user_id UUID;
  result JSON;
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only workspace owners can add users'
    );
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM profiles
  WHERE email = p_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User with this email not found'
    );
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = target_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is already a member of this workspace'
    );
  END IF;
  
  -- Add user to workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, target_user_id, p_role);
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User added to workspace successfully',
    'user_id', target_user_id,
    'email', p_user_email,
    'role', p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to remove user from workspace
CREATE OR REPLACE FUNCTION remove_user_from_workspace(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only workspace owners can remove users'
    );
  END IF;
  
  -- Don't allow removing the owner
  IF EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot remove workspace owner'
    );
  END IF;
  
  -- Remove user from workspace
  DELETE FROM workspace_members 
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User removed from workspace successfully',
    'user_id', p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_workspace_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_to_workspace_with_role(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_workspace(UUID, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_workspace_role IS 'Update user role in workspace - only for workspace owners';
COMMENT ON FUNCTION get_workspace_members IS 'Get workspace members with their roles - for workspace owners and members';
COMMENT ON FUNCTION add_user_to_workspace_with_role IS 'Add user to workspace with specific role - only for workspace owners';
COMMENT ON FUNCTION remove_user_from_workspace IS 'Remove user from workspace - only for workspace owners';

-- Test the functions
SELECT 'Functions created successfully' as status;
