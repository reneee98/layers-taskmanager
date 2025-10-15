-- Check RLS status and policies for workspaces
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'workspaces' AND schemaname = 'public';

-- Check if workspaces table has RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'workspaces' AND schemaname = 'public';

-- Check if workspaces exist
SELECT COUNT(*) as workspace_count FROM workspaces;
