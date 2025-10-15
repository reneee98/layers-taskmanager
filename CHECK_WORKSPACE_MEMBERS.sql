-- Check current workspace members and their roles
SELECT 
  wm.user_id,
  p.email,
  p.display_name,
  p.role as profile_role,
  wm.role as workspace_role,
  w.name as workspace_name
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
JOIN workspaces w ON wm.workspace_id = w.id
ORDER BY w.name, p.email;
