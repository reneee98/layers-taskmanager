-- Check status of user renkomoravec@gmail.com in Layers workspace
-- This will show if they are owner, member, or both

SELECT 
    'User Status Check' as info,
    p.id as user_id,
    p.email,
    p.display_name,
    w.id as workspace_id,
    w.name as workspace_name,
    w.owner_id,
    CASE 
        WHEN w.owner_id = p.id THEN 'Owner'
        ELSE 'Not Owner'
    END as ownership_status,
    wm.id as member_id,
    wm.role as member_role,
    CASE 
        WHEN wm.id IS NOT NULL THEN 'Member'
        ELSE 'Not Member'
    END as membership_status,
    CASE 
        WHEN w.owner_id = p.id THEN 'Cannot remove - is owner'
        WHEN wm.id IS NOT NULL THEN 'Can remove from workspace_members'
        ELSE 'Not in workspace'
    END as action_required
FROM profiles p
CROSS JOIN workspaces w
LEFT JOIN workspace_members wm ON wm.user_id = p.id AND wm.workspace_id = w.id
WHERE p.email = 'renkomoravec@gmail.com'
  AND w.id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

