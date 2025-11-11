-- Migration: Fix time_entries RLS policy for workspace members
-- Purpose: Ensure workspace members can insert time entries
-- This fixes the issue where members like Valentina cannot save time to tasks

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Workspace members can manage time entries" ON time_entries;
DROP POLICY IF EXISTS "Owners can manage time entries" ON time_entries;

-- Create policy for workspace members to manage time entries
-- This policy allows all workspace members to view, insert, update, and delete time entries
CREATE POLICY "Workspace members can manage time entries" ON time_entries
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );


