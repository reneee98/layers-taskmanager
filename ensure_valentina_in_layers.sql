-- Ensure Valentina Bušová is a member of Layers workspace
-- Run this in Supabase SQL editor

-- Direct INSERT with ON CONFLICT - simplest approach
INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
SELECT 
  '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'::UUID as workspace_id,
  p.id as user_id,
  'owner' as role,
  NOW() as created_at
FROM profiles p
WHERE (p.email ILIKE '%valentina%busova%' OR p.email ILIKE '%valentina%' OR p.display_name ILIKE '%valentina%')
LIMIT 1
ON CONFLICT (workspace_id, user_id) 
DO UPDATE SET 
  role = 'owner';

-- Verify it worked
SELECT 
  wm.workspace_id,
  w.name as workspace_name,
  wm.user_id,
  p.email as user_email,
  p.display_name,
  wm.role,
  wm.created_at
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
JOIN profiles p ON wm.user_id = p.id
WHERE w.id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'::UUID
  AND (p.email ILIKE '%valentina%' OR p.display_name ILIKE '%valentina%');

