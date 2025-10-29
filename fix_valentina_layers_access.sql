-- Fix Valentina Bušová access to Layers workspace
-- Run this in Supabase SQL editor

-- Step 1: Find Valentina's user ID and Layers workspace ID
SELECT 
  'Valentina user ID:' as info,
  id as user_id,
  email,
  display_name
FROM profiles
WHERE email ILIKE '%valentina%busova%' OR email ILIKE '%valentina%' OR display_name ILIKE '%valentina%'
LIMIT 1;

SELECT 
  'Layers workspace ID:' as info,
  id as workspace_id,
  name as workspace_name,
  owner_id,
  (SELECT email FROM profiles WHERE id = owner_id) as owner_email
FROM workspaces
WHERE name ILIKE '%layer%'
LIMIT 1;

-- Step 2: Check current status (REPLACE THE IDs BELOW WITH ACTUAL VALUES FROM STEP 1)
-- Replace 'VALENTINA_USER_ID' and 'LAYERS_WORKSPACE_ID' with actual IDs
DO $$
DECLARE
  valentina_user_id UUID := 'VALENTINA_USER_ID'::UUID; -- Replace with actual ID
  layers_workspace_id UUID := '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'::UUID; -- Layers workspace ID
  is_owner BOOLEAN;
  is_member BOOLEAN;
BEGIN
  -- Check if Valentina is owner
  SELECT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = layers_workspace_id AND owner_id = valentina_user_id
  ) INTO is_owner;
  
  -- Check if Valentina is member
  SELECT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = layers_workspace_id AND user_id = valentina_user_id
  ) INTO is_member;
  
  RAISE NOTICE 'Valentina is owner: %', is_owner;
  RAISE NOTICE 'Valentina is member: %', is_member;
  
  -- If neither, make her owner of Layers workspace
  IF NOT is_owner AND NOT is_member THEN
    -- Option A: Make her the owner (change owner_id)
    UPDATE workspaces 
    SET owner_id = valentina_user_id
    WHERE id = layers_workspace_id;
    
    RAISE NOTICE '✓ Made Valentina owner of Layers workspace';
    
    -- Also add her as member with owner role
    INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
    VALUES (layers_workspace_id, valentina_user_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';
    
    RAISE NOTICE '✓ Added Valentina as member with owner role';
  ELSIF NOT is_owner THEN
    -- She is member but not owner - make her owner
    UPDATE workspaces 
    SET owner_id = valentina_user_id
    WHERE id = layers_workspace_id;
    
    UPDATE workspace_members
    SET role = 'owner'
    WHERE workspace_id = layers_workspace_id AND user_id = valentina_user_id;
    
    RAISE NOTICE '✓ Made Valentina owner of Layers workspace and updated member role';
  ELSIF NOT is_member THEN
    -- She is owner but not member - add as member
    INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
    VALUES (layers_workspace_id, valentina_user_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';
    
    RAISE NOTICE '✓ Added Valentina as member (already was owner)';
  ELSE
    RAISE NOTICE '✓ Valentina already has access to Layers workspace';
  END IF;
END $$;

-- Step 3: Verify the fix
-- Replace 'VALENTINA_USER_ID' with actual ID
SELECT 
  'Verification:' as info,
  w.name as workspace_name,
  CASE 
    WHEN w.owner_id = 'VALENTINA_USER_ID'::UUID THEN 'Owner'
    WHEN EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = w.id AND user_id = 'VALENTINA_USER_ID'::UUID) THEN 'Member'
    ELSE 'No access'
  END as access_status
FROM workspaces w
WHERE w.name ILIKE '%layer%';

