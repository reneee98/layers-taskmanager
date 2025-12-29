-- Remove unauthorized members from Layers workspace
-- This removes all members except the actual owner

-- First, let's see who we're removing
SELECT 
    'Will remove these unauthorized members:' as info,
    wm.user_id,
    p.email,
    p.display_name,
    wm.role
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
  AND wm.user_id != w.owner_id  -- Keep only the owner
ORDER BY wm.created_at DESC;

-- ACTUAL DELETION - Uncomment to execute:
-- DELETE FROM workspace_members
-- WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
--   AND user_id != (SELECT owner_id FROM workspaces WHERE id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0');

-- After deletion, verify only owner remains
SELECT 
    'Remaining members after cleanup:' as info,
    wm.user_id,
    p.email,
    p.display_name,
    wm.role,
    CASE 
        WHEN wm.user_id = w.owner_id THEN 'Owner ✓'
        ELSE 'Member - SHOULD BE REMOVED'
    END as status
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
ORDER BY wm.created_at DESC;

