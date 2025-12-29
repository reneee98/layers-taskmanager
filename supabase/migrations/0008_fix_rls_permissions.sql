-- Migration: Fix RLS permissions for workspace members
-- Purpose: Allow workspace owners and members to see all data

-- First, disable RLS temporarily to check data
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Check current data
SELECT 'Tasks count:' as table_name, COUNT(*) as count FROM tasks WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
UNION ALL
SELECT 'Projects count:', COUNT(*) FROM projects WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
UNION ALL
SELECT 'Clients count:', COUNT(*) FROM clients WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
UNION ALL
SELECT 'Time entries count:', COUNT(*) FROM time_entries WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Check workspace members
SELECT 'Workspace members:' as info, COUNT(*) as count FROM workspace_members WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Check profiles
SELECT 'Profiles count:' as info, COUNT(*) as count FROM profiles;

-- Re-enable RLS with proper policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Workspace members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can delete tasks" ON tasks;

DROP POLICY IF EXISTS "Workspace members can view time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can insert time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can update time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can delete time entries" ON time_entries;

DROP POLICY IF EXISTS "Workspace members can view task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can insert task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can update task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can delete task assignees" ON task_assignees;

DROP POLICY IF EXISTS "Workspace members can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can insert task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can update task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can delete task comments" ON task_comments;

-- Create simple policies that allow all workspace members to do everything

-- Tasks policies
CREATE POLICY "Workspace members can manage tasks" ON tasks
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Time entries policies
CREATE POLICY "Workspace members can manage time entries" ON time_entries
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Task assignees policies
CREATE POLICY "Workspace members can manage task assignees" ON task_assignees
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Task comments policies
CREATE POLICY "Workspace members can manage task comments" ON task_comments
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Projects policies
CREATE POLICY "Workspace members can manage projects" ON projects
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Clients policies
CREATE POLICY "Workspace members can manage clients" ON clients
  FOR ALL USING (
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
COMMENT ON TABLE projects IS 'Projects table with RLS enabled - all workspace members can manage projects';
COMMENT ON TABLE clients IS 'Clients table with RLS enabled - all workspace members can manage clients';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tasks', 'time_entries', 'task_assignees', 'task_comments', 'projects', 'clients')
  AND schemaname = 'public';
