-- Migration: Fix workspaces RLS to ensure owners can always see their workspaces
-- Purpose: Fix issue where workspace owners cannot see their workspace due to RLS policy issues
-- Date: 2025-01-29

-- The problem: The existing RLS policy uses a subquery to workspace_members which might
-- have issues when workspace_members RLS is enabled, preventing owners from seeing their workspaces.

-- Solution: Use a SECURITY DEFINER function to bypass RLS when checking membership,
-- similar to how workspace_members RLS is handled.

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view accessible workspaces" ON workspaces;

-- Create a helper function that checks if user has access to workspace
-- This function bypasses RLS to prevent recursion issues
CREATE OR REPLACE FUNCTION user_has_workspace_access(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is owner
  IF EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is member (bypassing RLS)
  IF EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the updated policy using the helper function
CREATE POLICY "Users can view accessible workspaces" ON workspaces
  FOR SELECT USING (
    user_has_workspace_access(id, auth.uid())
  );

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workspaces' 
    AND policyname = 'Users can view accessible workspaces'
  ) THEN
    RAISE NOTICE '✓ Workspaces RLS policy updated successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create workspaces RLS policy';
  END IF;
END $$;

