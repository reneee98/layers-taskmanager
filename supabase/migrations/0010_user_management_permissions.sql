-- Migration: User management permissions
-- Purpose: Only workspace owners can manage users and their roles

-- Enable RLS on profiles and workspace_members tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Owners can manage all profiles" ON profiles;

DROP POLICY IF EXISTS "Workspace members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members can delete workspace members" ON workspace_members;

-- PROFILES policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Only workspace owners can manage all profiles (including roles)
CREATE POLICY "Owners can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE owner_id = auth.uid()
    )
  );

-- WORKSPACE_MEMBERS policies
-- Only workspace owners can manage workspace members
CREATE POLICY "Owners can manage workspace members" ON workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

-- Members can view workspace members in their workspaces
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create helper function to check if user can manage workspace
CREATE OR REPLACE FUNCTION can_manage_workspace(workspace_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_id AND owner_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add user to workspace (only for owners)
CREATE OR REPLACE FUNCTION add_user_to_workspace(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT can_manage_workspace(p_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only workspace owners can add users';
  END IF;
  
  -- Insert user into workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, p_user_id, p_role)
  ON CONFLICT (workspace_id, user_id) 
  DO UPDATE SET role = p_role;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to remove user from workspace (only for owners)
CREATE OR REPLACE FUNCTION remove_user_from_workspace(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT can_manage_workspace(p_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only workspace owners can remove users';
  END IF;
  
  -- Don't allow removing the owner
  IF EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace_id AND owner_id = p_user_id) THEN
    RAISE EXCEPTION 'Cannot remove workspace owner';
  END IF;
  
  -- Remove user from workspace
  DELETE FROM workspace_members 
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user role (only for owners)
CREATE OR REPLACE FUNCTION update_user_role(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT can_manage_workspace(p_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only workspace owners can update user roles';
  END IF;
  
  -- Don't allow changing owner role
  IF EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace_id AND owner_id = p_user_id) THEN
    RAISE EXCEPTION 'Cannot change workspace owner role';
  END IF;
  
  -- Update user role
  UPDATE workspace_members 
  SET role = p_role
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION add_user_to_workspace(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_workspace(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, UUID, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE profiles IS 'Profiles table - users can manage own profile, owners can manage all';
COMMENT ON TABLE workspace_members IS 'Workspace members table - only owners can manage members';
COMMENT ON FUNCTION add_user_to_workspace IS 'Add user to workspace - only for workspace owners';
COMMENT ON FUNCTION remove_user_from_workspace IS 'Remove user from workspace - only for workspace owners';
COMMENT ON FUNCTION update_user_role IS 'Update user role - only for workspace owners';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'workspace_members')
  AND schemaname = 'public';
