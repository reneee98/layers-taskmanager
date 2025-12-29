-- Quick verification script - run this to check if Valentina is in workspace_members
SELECT 
  wm.workspace_id,
  w.name as workspace_name,
  wm.user_id,
  p.email as user_email,
  wm.role,
  wm.created_at
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE w.name ILIKE '%layer%'
  AND (p.email ILIKE '%valentina%' OR p.display_name ILIKE '%valentina%');

