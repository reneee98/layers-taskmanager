-- Run this in Supabase SQL Editor to fix the checklist RLS policies properly

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view task checklist items for their workspace tasks" ON task_checklist_items;
DROP POLICY IF EXISTS "Users can insert task checklist items for their workspace tasks" ON task_checklist_items;
DROP POLICY IF EXISTS "Users can update task checklist items for their workspace tasks" ON task_checklist_items;
DROP POLICY IF EXISTS "Users can delete task checklist items for their workspace tasks" ON task_checklist_items;

-- Create corrected RLS policies
-- Policy for workspace members to view checklist items
CREATE POLICY "Users can view task checklist items for their workspace tasks" ON task_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to insert checklist items
-- Use the NEW.task_id from the INSERT values
CREATE POLICY "Users can insert task checklist items for their workspace tasks" ON task_checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = NEW.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to update checklist items
CREATE POLICY "Users can update task checklist items for their workspace tasks" ON task_checklist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to delete checklist items
CREATE POLICY "Users can delete task checklist items for their workspace tasks" ON task_checklist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );
