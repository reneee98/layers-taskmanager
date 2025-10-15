-- Check if tasks exist in database
SELECT COUNT(*) as task_count FROM tasks WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'tasks' AND schemaname = 'public';

-- Check if user exists
SELECT id, email FROM profiles LIMIT 5;
