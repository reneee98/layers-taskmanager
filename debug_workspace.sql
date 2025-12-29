-- Debug workspace membership
SELECT 
  wm.id,
  wm.workspace_id,
  wm.user_id,
  p.email,
  p.display_name
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
ORDER BY wm.workspace_id, wm.user_id;

-- Check specific task and its workspace
SELECT 
  t.id as task_id,
  t.title,
  p.id as project_id,
  p.name as project_name,
  p.workspace_id
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.id = '186f9cd7-a297-45f6-9ce1-978c419f469e';
