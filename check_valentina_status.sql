-- Check Valentina's access and RLS status
SELECT 'Valentina in workspace_members:' as info, wm.user_id, wm.role, p.email, p.display_name
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
  AND (p.email ILIKE '%valentina%' OR p.display_name ILIKE '%valentina%');

-- Check RLS status
SELECT 'RLS Status:' as info, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tasks', 'task_assignees', 'workspace_members', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename;

-- Check if there are any tasks in the workspace
SELECT 'Tasks in workspace:' as info, COUNT(*) as count
FROM tasks 
WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';
