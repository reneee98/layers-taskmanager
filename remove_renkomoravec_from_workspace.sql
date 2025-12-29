-- Remove renkomoravec@gmail.com from Layers workspace
-- This script will find and remove the user from workspace_members

-- First, let's find the exact user ID and check all records
SELECT 
    'Current status before removal' as info,
    p.id as user_id,
    p.email,
    p.display_name,
    wm.id as member_id,
    wm.workspace_id,
    wm.user_id as member_user_id,
    wm.role,
    wm.created_at as member_created_at,
    w.name as workspace_name
FROM profiles p
LEFT JOIN workspace_members wm ON wm.user_id = p.id
LEFT JOIN workspaces w ON w.id = wm.workspace_id
WHERE p.email = 'renkomoravec@gmail.com'
  AND (wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0' OR wm.workspace_id IS NULL);

-- Now remove the user from workspace_members
-- This will delete ALL workspace_members entries for this user in Layers workspace
DELETE FROM workspace_members
WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
  AND user_id IN (
    SELECT id FROM profiles WHERE email = 'renkomoravec@gmail.com'
  );

-- Verify removal
SELECT 
    'Status after removal' as info,
    p.id as user_id,
    p.email,
    p.display_name,
    wm.id as member_id,
    CASE 
        WHEN wm.id IS NULL THEN 'Removed successfully - no longer in workspace'
        ELSE 'Still exists - removal failed'
    END as status
FROM profiles p
LEFT JOIN workspace_members wm ON wm.user_id = p.id 
    AND wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
WHERE p.email = 'renkomoravec@gmail.com';

