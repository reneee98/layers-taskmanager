-- Migration: Disable RLS for development
-- Purpose: Temporarily disable RLS to fix 500 errors and allow data access

-- Disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Check data counts
SELECT 'Profiles count:' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'Workspaces count:', COUNT(*) FROM workspaces
UNION ALL
SELECT 'Workspace members count:', COUNT(*) FROM workspace_members
UNION ALL
SELECT 'Tasks count:', COUNT(*) FROM tasks
UNION ALL
SELECT 'Projects count:', COUNT(*) FROM projects
UNION ALL
SELECT 'Clients count:', COUNT(*) FROM clients
UNION ALL
SELECT 'Time entries count:', COUNT(*) FROM time_entries;

-- Check specific user data
SELECT 'User profile:' as info, id, email, display_name, role 
FROM profiles 
WHERE id = '775560ca-adfa-4df2-9768-6ea553494e1f';

-- Check user workspaces
SELECT 'User workspaces:' as info, w.id, w.name, w.owner_id, wm.role
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = '775560ca-adfa-4df2-9768-6ea553494e1f'
WHERE w.owner_id = '775560ca-adfa-4df2-9768-6ea553494e1f' OR wm.user_id = '775560ca-adfa-4df2-9768-6ea553494e1f';

-- Add comment for documentation
COMMENT ON TABLE profiles IS 'Profiles table - RLS disabled for development';
COMMENT ON TABLE workspaces IS 'Workspaces table - RLS disabled for development';
COMMENT ON TABLE workspace_members IS 'Workspace members table - RLS disabled for development';
COMMENT ON TABLE tasks IS 'Tasks table - RLS disabled for development';
COMMENT ON TABLE time_entries IS 'Time entries table - RLS disabled for development';
COMMENT ON TABLE task_assignees IS 'Task assignees table - RLS disabled for development';
COMMENT ON TABLE task_comments IS 'Task comments table - RLS disabled for development';
COMMENT ON TABLE projects IS 'Projects table - RLS disabled for development';
COMMENT ON TABLE clients IS 'Clients table - RLS disabled for development';

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'workspaces', 'workspace_members', 'tasks', 'time_entries', 'task_assignees', 'task_comments', 'projects', 'clients')
  AND schemaname = 'public';
