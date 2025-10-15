-- Check RLS status for all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tasks', 'task_assignees', 'workspace_members', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename;

-- Check if Valentina is a member of the workspace
SELECT wm.user_id, wm.role, p.email, p.display_name
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';
