-- Migration: Fix tasks RLS policy for workspace members
-- Purpose: Allow workspace members (not just owners) to view and manage tasks
-- This fixes the issue where members like Valentina cannot see tasks

-- Add policy for workspace members to manage tasks
-- This policy allows all workspace members to view, insert, update, and delete tasks
CREATE POLICY "Workspace members can manage tasks" ON tasks
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- Add policy for workspace members to manage time entries
CREATE POLICY "Workspace members can manage time entries" ON time_entries
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- Add policy for workspace members to manage task assignees
CREATE POLICY "Workspace members can manage task assignees" ON task_assignees
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND (
        t.workspace_id IN (
          SELECT workspace_id 
          FROM workspace_members 
          WHERE user_id = auth.uid()
        )
        OR is_workspace_owner(t.workspace_id, auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND (
        t.workspace_id IN (
          SELECT workspace_id 
          FROM workspace_members 
          WHERE user_id = auth.uid()
        )
        OR is_workspace_owner(t.workspace_id, auth.uid())
      )
    )
  );

-- Add policy for workspace members to manage task comments
CREATE POLICY "Workspace members can manage task comments" ON task_comments
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
      AND (
        t.workspace_id IN (
          SELECT workspace_id 
          FROM workspace_members 
          WHERE user_id = auth.uid()
        )
        OR is_workspace_owner(t.workspace_id, auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
      AND (
        t.workspace_id IN (
          SELECT workspace_id 
          FROM workspace_members 
          WHERE user_id = auth.uid()
        )
        OR is_workspace_owner(t.workspace_id, auth.uid())
      )
    )
  );

