-- Migration: Fix tasks RLS policy for owners to allow INSERT operations
-- Purpose: Add WITH CHECK clause to allow owners to create tasks

-- Drop existing policy
DROP POLICY IF EXISTS "Owners can manage tasks" ON tasks;

-- Recreate policy with WITH CHECK for INSERT operations
CREATE POLICY "Owners can manage tasks" ON tasks
  FOR ALL 
  USING (
    is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- Also fix time entries, task assignees, and task comments policies
DROP POLICY IF EXISTS "Owners can manage time entries" ON time_entries;
CREATE POLICY "Owners can manage time entries" ON time_entries
  FOR ALL 
  USING (
    is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    is_workspace_owner(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "Owners can manage task assignees" ON task_assignees;
CREATE POLICY "Owners can manage task assignees" ON task_assignees
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND is_workspace_owner(t.workspace_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND is_workspace_owner(t.workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can manage task comments" ON task_comments;
CREATE POLICY "Owners can manage task comments" ON task_comments
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
      AND is_workspace_owner(t.workspace_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
      AND is_workspace_owner(t.workspace_id, auth.uid())
    )
  );

