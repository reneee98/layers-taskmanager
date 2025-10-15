-- Disable RLS temporarily to check data
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;

-- Check if tasks exist
SELECT COUNT(*) as task_count FROM tasks WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Check tasks data
SELECT id, title, status, project_id FROM tasks WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0' LIMIT 5;
