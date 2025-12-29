-- Check Valentina's membership status in all workspaces
-- Run this in Supabase SQL editor

-- Find Valentina's user ID
SELECT id, email, display_name 
FROM profiles 
WHERE (email ILIKE '%valentina%busova%' OR email ILIKE '%valentina%' OR display_name ILIKE '%valentina%')
LIMIT 1;

-- Check if Valentina is in workspace_members for Layers
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

-- Check all workspace memberships for Valentina
SELECT 
  wm.workspace_id,
  w.name as workspace_name,
  wm.role,
  wm.created_at
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
JOIN profiles p ON wm.user_id = p.id
WHERE (p.email ILIKE '%valentina%' OR p.display_name ILIKE '%valentina%');

-- Check if Valentina owns any workspaces
SELECT 
  id,
  name,
  description,
  owner_id,
  created_at
FROM workspaces
WHERE owner_id IN (
  SELECT id FROM profiles 
  WHERE (email ILIKE '%valentina%busova%' OR email ILIKE '%valentina%' OR display_name ILIKE '%valentina%')
);

