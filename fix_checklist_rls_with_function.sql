-- Run this in Supabase SQL Editor to fix the checklist RLS policies with a helper function

-- Create a helper function to check task access
CREATE OR REPLACE FUNCTION check_task_access(task_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = task_id_param
    AND wm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view task checklist items for their workspace tasks" ON task_checklist_items;
DROP POLICY IF EXISTS "Users can insert task checklist items for their workspace tasks" ON task_checklist_items;
DROP POLICY IF EXISTS "Users can update task checklist items for their workspace tasks" ON task_checklist_items;
DROP POLICY IF EXISTS "Users can delete task checklist items for their workspace tasks" ON task_checklist_items;

-- Create corrected RLS policies using the helper function
-- Policy for workspace members to view checklist items
CREATE POLICY "Users can view task checklist items for their workspace tasks" ON task_checklist_items
  FOR SELECT USING (check_task_access(task_id));

-- Policy for workspace members to insert checklist items
CREATE POLICY "Users can insert task checklist items for their workspace tasks" ON task_checklist_items
  FOR INSERT WITH CHECK (check_task_access(task_id));

-- Policy for workspace members to update checklist items
CREATE POLICY "Users can update task checklist items for their workspace tasks" ON task_checklist_items
  FOR UPDATE USING (check_task_access(task_id));

-- Policy for workspace members to delete checklist items
CREATE POLICY "Users can delete task checklist items for their workspace tasks" ON task_checklist_items
  FOR DELETE USING (check_task_access(task_id));
