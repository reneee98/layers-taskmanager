-- Migration: Fix project creation RLS policy
-- Purpose: Ensure WITH CHECK clause correctly uses workspace_id from the row being inserted

-- Drop existing policy
DROP POLICY IF EXISTS "Users with projects.create can create projects" ON projects;

-- Recreate policy with explicit workspace_id reference
CREATE POLICY "Users with projects.create can create projects" ON projects
  FOR INSERT WITH CHECK (
    workspace_id IS NOT NULL AND
    has_permission(auth.uid(), 'projects', 'create', workspace_id) = TRUE
  );

-- Add comment
COMMENT ON POLICY "Users with projects.create can create projects" ON projects IS 
  'Users can create projects if they have projects.create permission for the workspace_id being inserted';

