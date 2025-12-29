-- Diagnostic SQL script to check why Valentina Bušová cannot see Layers workspace
-- Run this in Supabase SQL editor to diagnose the issue

-- Step 1: Find Valentina's user ID
SELECT 
  id as user_id,
  email,
  display_name
FROM profiles
WHERE email ILIKE '%valentina%' OR email ILIKE '%busova%' OR display_name ILIKE '%valentina%';

-- Step 2: Check if Valentina is owner of Layers workspace
-- Replace 'VALENTINA_USER_ID' with the actual user_id from Step 1
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  w.owner_id,
  p.email as owner_email,
  CASE 
    WHEN w.owner_id = 'VALENTINA_USER_ID' THEN 'YES - Valentina is owner'
    ELSE 'NO - Different owner'
  END as ownership_status
FROM workspaces w
LEFT JOIN profiles p ON w.owner_id = p.id
WHERE w.name ILIKE '%layer%';

-- Step 3: Check if Valentina is member of Layers workspace (replace USER_ID)
SELECT 
  wm.workspace_id,
  w.name as workspace_name,
  wm.user_id,
  wm.role,
  p.email as member_email,
  CASE 
    WHEN wm.user_id = 'VALENTINA_USER_ID' THEN 'YES - Valentina is member'
    ELSE 'NO'
  END as membership_status
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE w.name ILIKE '%layer%';

-- Step 4: Test RLS policy - check if user_has_workspace_access function works
-- Replace both IDs with actual values
SELECT 
  user_has_workspace_access('LAYERS_WORKSPACE_ID'::UUID, 'VALENTINA_USER_ID'::UUID) as has_access;

-- Step 5: Direct query bypassing RLS (run as service role)
-- This should always return workspaces if Valentina is owner
-- Replace USER_ID
SELECT 
  id,
  name,
  description,
  owner_id
FROM workspaces
WHERE owner_id = 'VALENTINA_USER_ID';

