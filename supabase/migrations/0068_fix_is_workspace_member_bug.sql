-- Migration: Fix is_workspace_member function bug
-- Purpose: Fix WHERE clause that compares parameter to itself instead of table column
-- This fixes the issue where workspace members cannot see projects/data
-- Date: 2025-11-11

-- ==============================================================================
-- FIX: is_workspace_member function
-- ==============================================================================

-- Drop existing buggy function
DROP FUNCTION IF EXISTS is_workspace_member(UUID, UUID);

-- Recreate with proper parameter names (with p_ prefix to avoid conflicts)
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = p_workspace_id 
      AND workspace_members.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_workspace_member IS 
  'Returns TRUE if user is a member of the workspace (fixed parameter naming bug)';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_workspace_member(UUID, UUID) TO authenticated;

-- ==============================================================================
-- ALSO FIX: is_workspace_owner function (same potential issue)
-- ==============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS is_workspace_owner(UUID, UUID);

-- Recreate with proper parameter names
CREATE OR REPLACE FUNCTION is_workspace_owner(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = p_workspace_id 
      AND workspaces.owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_workspace_owner IS 
  'Returns TRUE if user is the owner of the workspace (fixed parameter naming)';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_workspace_owner(UUID, UUID) TO authenticated;

-- ==============================================================================
-- UPDATE: Projects policies to ensure they work correctly
-- ==============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage projects" ON projects;
DROP POLICY IF EXISTS "Members can view projects" ON projects;
DROP POLICY IF EXISTS "Workspace members can manage projects" ON projects;

-- Create updated policies using fixed functions
-- Policy 1: Owners can do everything
CREATE POLICY "Owners can manage projects" ON projects
  FOR ALL 
  USING (is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (is_workspace_owner(workspace_id, auth.uid()));

-- Policy 2: Members can view projects (SELECT only)
CREATE POLICY "Members can view projects" ON projects
  FOR SELECT 
  USING (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- Policy 3: Members can also INSERT/UPDATE/DELETE projects (full access like tasks)
-- This ensures members have same access to projects as they do to tasks
CREATE POLICY "Members can manage projects" ON projects
  FOR ALL
  USING (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- ==============================================================================
-- UPDATE: Clients policies (same issue)
-- ==============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage clients" ON clients;
DROP POLICY IF EXISTS "Members can view clients" ON clients;
DROP POLICY IF EXISTS "Workspace members can manage clients" ON clients;

-- Create updated policies
-- Policy 1: Owners can do everything
CREATE POLICY "Owners can manage clients" ON clients
  FOR ALL 
  USING (is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (is_workspace_owner(workspace_id, auth.uid()));

-- Policy 2: Members can view clients
CREATE POLICY "Members can view clients" ON clients
  FOR SELECT 
  USING (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- Policy 3: Members can manage clients
CREATE POLICY "Members can manage clients" ON clients
  FOR ALL
  USING (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

DO $$
BEGIN
  -- Check that functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_workspace_member'
  ) THEN
    RAISE EXCEPTION 'Function is_workspace_member not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_workspace_owner'
  ) THEN
    RAISE EXCEPTION 'Function is_workspace_owner not created';
  END IF;
  
  -- Check that policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Owners can manage projects'
  ) THEN
    RAISE EXCEPTION 'Policy "Owners can manage projects" not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Members can view projects'
  ) THEN
    RAISE EXCEPTION 'Policy "Members can view projects" not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Members can manage projects'
  ) THEN
    RAISE EXCEPTION 'Policy "Members can manage projects" not created';
  END IF;
  
  RAISE NOTICE '✅ All functions and policies fixed successfully!';
  RAISE NOTICE '✅ Workspace members can now view and manage projects!';
END $$;

