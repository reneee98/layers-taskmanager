-- Migration: Enable RLS and create permissions for workspace members
-- Purpose: Allow all workspace members to manage tasks, while maintaining security

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Workspace members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can delete tasks" ON tasks;

-- Create comprehensive RLS policies for tasks

-- 1. View tasks: All workspace members can view tasks in their workspace
CREATE POLICY "Workspace members can view tasks" ON tasks
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- 2. Insert tasks: All workspace members can create tasks in their workspace
CREATE POLICY "Workspace members can insert tasks" ON tasks
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- 3. Update tasks: All workspace members can update tasks in their workspace
CREATE POLICY "Workspace members can update tasks" ON tasks
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- 4. Delete tasks: All workspace members can delete tasks in their workspace
CREATE POLICY "Workspace members can delete tasks" ON tasks
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Enable RLS on other related tables
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Time entries policies
DROP POLICY IF EXISTS "Workspace members can view time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can insert time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can update time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can delete time entries" ON time_entries;

CREATE POLICY "Workspace members can view time entries" ON time_entries
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert time entries" ON time_entries
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update time entries" ON time_entries
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete time entries" ON time_entries
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Task assignees policies
DROP POLICY IF EXISTS "Workspace members can view task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can insert task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can update task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can delete task assignees" ON task_assignees;

CREATE POLICY "Workspace members can view task assignees" ON task_assignees
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert task assignees" ON task_assignees
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update task assignees" ON task_assignees
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete task assignees" ON task_assignees
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Task comments policies
DROP POLICY IF EXISTS "Workspace members can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can insert task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can update task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can delete task comments" ON task_comments;

CREATE POLICY "Workspace members can view task comments" ON task_comments
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert task comments" ON task_comments
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update task comments" ON task_comments
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete task comments" ON task_comments
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE tasks IS 'Tasks table with RLS enabled - all workspace members can manage tasks';
COMMENT ON TABLE time_entries IS 'Time entries table with RLS enabled - all workspace members can manage time entries';
COMMENT ON TABLE task_assignees IS 'Task assignees table with RLS enabled - all workspace members can manage assignees';
COMMENT ON TABLE task_comments IS 'Task comments table with RLS enabled - all workspace members can manage comments';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tasks', 'time_entries', 'task_assignees', 'task_comments')
  AND schemaname = 'public';
