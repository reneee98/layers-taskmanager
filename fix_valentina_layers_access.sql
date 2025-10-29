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
  -- IMPORTANT: Cannot make her owner due to unique constraint on workspaces.owner_id
  -- (She already owns another workspace). Instead, add her as member with admin/owner role.
  
  IF NOT is_member THEN
    -- Add her as member with 'owner' role (gives her full access)
    INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
    VALUES (layers_workspace_id, valentina_user_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';
    
    RAISE NOTICE '✓ Added Valentina as member of Layers workspace with owner role';
  ELSE
    -- Update role to owner if she's already a member but with different role
    UPDATE workspace_members
    SET role = 'owner'
    WHERE workspace_id = layers_workspace_id AND user_id = valentina_user_id AND role != 'owner';
    
    RAISE NOTICE '✓ Valentina already has access to Layers workspace (checked/updated role)';
  END IF;
  
  -- Note: We cannot change workspaces.owner_id because of unique constraint
  -- (Valentina already owns another workspace), but being a member with 'owner' role
  -- gives her the same permissions.
  
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
