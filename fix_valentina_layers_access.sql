-- Fix Valentina Bušová access to Layers workspace
-- Run this entire script in Supabase SQL editor

DO $$
DECLARE
  valentina_user_id UUID;
  layers_workspace_id UUID := '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'::UUID; -- Layers workspace ID
  is_owner BOOLEAN := FALSE;
  is_member BOOLEAN := FALSE;
BEGIN
  -- Step 1: Find Valentina's user ID
  SELECT id INTO valentina_user_id
  FROM profiles
  WHERE email ILIKE '%valentina%busova%' 
     OR email ILIKE '%valentina%' 
     OR display_name ILIKE '%valentina%'
  LIMIT 1;
  
  IF valentina_user_id IS NULL THEN
    RAISE EXCEPTION 'Valentina user not found. Please check the profiles table manually.';
  END IF;
  
  RAISE NOTICE 'Found Valentina user ID: %', valentina_user_id;
  
  -- Step 2: Check current status
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
  
  -- Step 3: Fix access
  IF NOT is_owner AND NOT is_member THEN
    -- Make her the owner
    UPDATE workspaces 
    SET owner_id = valentina_user_id
    WHERE id = layers_workspace_id;
    
    RAISE NOTICE '✓ Made Valentina owner of Layers workspace';
    
    -- Add her as member with owner role
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
  
  RAISE NOTICE 'Fix completed successfully!';
END $$;

-- Verification query
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  w.owner_id,
  p.email as owner_email,
  CASE 
    WHEN w.owner_id = (SELECT id FROM profiles WHERE email ILIKE '%valentina%' LIMIT 1) THEN 'Owner'
    WHEN EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = w.id 
      AND wm.user_id = (SELECT id FROM profiles WHERE email ILIKE '%valentina%' LIMIT 1)
    ) THEN 'Member'
    ELSE 'No access'
  END as valentina_access_status
FROM workspaces w
LEFT JOIN profiles p ON w.owner_id = p.id
WHERE w.name ILIKE '%layer%';
