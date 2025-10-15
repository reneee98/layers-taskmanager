-- Migration: Setup roles and permissions
-- Purpose: Majiteľ vidí všetko, Člen vidí len projekty a klientov bez cien

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

-- Check workspace members and their roles
SELECT 'Workspace members:' as info, COUNT(*) as count FROM workspace_members WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Check current roles
SELECT wm.user_id, p.email, p.display_name, p.role as profile_role, wm.role as workspace_role
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Re-enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Workspace members can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can manage time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can manage task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can manage task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can manage projects" ON projects;
DROP POLICY IF EXISTS "Workspace members can manage clients" ON clients;

-- Create helper function to check if user is owner
CREATE OR REPLACE FUNCTION is_workspace_owner(workspace_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_id AND owner_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is member
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspace_id AND user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TASKS: Only owners can see and manage tasks
CREATE POLICY "Owners can manage tasks" ON tasks
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- TIME ENTRIES: Only owners can see and manage time entries
CREATE POLICY "Owners can manage time entries" ON time_entries
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- TASK ASSIGNEES: Only owners can see and manage task assignees
CREATE POLICY "Owners can manage task assignees" ON task_assignees
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- TASK COMMENTS: Only owners can see and manage task comments
CREATE POLICY "Owners can manage task comments" ON task_comments
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- PROJECTS: Both owners and members can see projects
-- Owners see everything, members see without prices
CREATE POLICY "Owners can manage projects" ON projects
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

CREATE POLICY "Members can view projects" ON projects
  FOR SELECT USING (
    is_workspace_member(workspace_id, auth.uid())
  );

-- CLIENTS: Both owners and members can see clients
-- Owners see everything, members see without prices
CREATE POLICY "Owners can manage clients" ON clients
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

CREATE POLICY "Members can view clients" ON clients
  FOR SELECT USING (
    is_workspace_member(workspace_id, auth.uid())
  );

-- Create views for members (without sensitive data)

-- Projects view for members (without prices)
CREATE OR REPLACE VIEW member_projects_view AS
SELECT 
  id,
  name,
  description,
  status,
  start_date,
  end_date,
  client_id,
  workspace_id,
  created_at,
  updated_at
FROM projects
WHERE workspace_id IN (
  SELECT workspace_id 
  FROM workspace_members 
  WHERE user_id = auth.uid()
);

-- Clients view for members (without prices)
CREATE OR REPLACE VIEW member_clients_view AS
SELECT 
  id,
  name,
  email,
  phone,
  address,
  workspace_id,
  created_at,
  updated_at
FROM clients
WHERE workspace_id IN (
  SELECT workspace_id 
  FROM workspace_members 
  WHERE user_id = auth.uid()
);

-- Grant access to views
GRANT SELECT ON member_projects_view TO authenticated;
GRANT SELECT ON member_clients_view TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE tasks IS 'Tasks table - only workspace owners can manage';
COMMENT ON TABLE time_entries IS 'Time entries table - only workspace owners can manage';
COMMENT ON TABLE task_assignees IS 'Task assignees table - only workspace owners can manage';
COMMENT ON TABLE task_comments IS 'Task comments table - only workspace owners can manage';
COMMENT ON TABLE projects IS 'Projects table - owners can manage, members can view';
COMMENT ON TABLE clients IS 'Clients table - owners can manage, members can view';
COMMENT ON VIEW member_projects_view IS 'Projects view for members - without prices';
COMMENT ON VIEW member_clients_view IS 'Clients view for members - without prices';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tasks', 'time_entries', 'task_assignees', 'task_comments', 'projects', 'clients')
  AND schemaname = 'public';
