-- Find all members in Layers workspace who are NOT the owner
SELECT 
    wm.user_id,
    wm.role,
    wm.created_at,
    p.email,
    p.display_name,
    w.owner_id,
    CASE 
        WHEN wm.user_id = w.owner_id THEN 'Owner (OK)'
        ELSE 'Member (check if authorized)'
    END as status
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
ORDER BY wm.created_at DESC;

-- Check which users can actually see Layers workspace (should only be owner and invited members)
-- This simulates what getUserAccessibleWorkspaces should return
SELECT 
    'Users who SHOULD see Layers workspace' as info,
    w.owner_id as owner_user_id,
    (SELECT email FROM profiles WHERE id = w.owner_id) as owner_email
FROM workspaces w
WHERE w.id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- List all members (these should only be users invited by owner)
SELECT 
    'Members of Layers workspace' as info,
    wm.user_id,
    p.email,
    wm.role,
    wm.created_at
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
ORDER BY wm.created_at DESC;

