-- Find and remove unauthorized members from Layers workspace
-- This will find all members who were NOT invited by the owner

-- First, list all members who are NOT the owner
SELECT 
    'Members to check for removal' as info,
    wm.user_id,
    p.email,
    p.display_name,
    wm.role,
    wm.created_at,
    w.owner_id,
    CASE 
        WHEN wm.user_id = w.owner_id THEN 'Owner - KEEP'
        ELSE 'Member - CHECK IF AUTHORIZED'
    END as action
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
  AND wm.user_id != w.owner_id  -- Exclude owner
ORDER BY wm.created_at DESC;

-- To REMOVE unauthorized members, uncomment and run:
-- DELETE FROM workspace_members
-- WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
--   AND user_id != (SELECT owner_id FROM workspaces WHERE id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0')
--   AND user_id NOT IN (
--     -- Add user IDs here that SHOULD be members (invited by owner)
--     -- Example: 'user-id-1', 'user-id-2'
--   );

