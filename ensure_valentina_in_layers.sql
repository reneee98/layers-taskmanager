-- Ensure Valentina Bušová is a member of Layers workspace
-- Run this in Supabase SQL editor

DO $$
DECLARE
  valentina_user_id UUID;
  layers_workspace_id UUID := '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'::UUID;
  existing_member BOOLEAN := FALSE;
BEGIN
  -- Find Valentina's user ID
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
  
  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = layers_workspace_id 
    AND user_id = valentina_user_id
  ) INTO existing_member;
  
  IF existing_member THEN
    RAISE NOTICE '✓ Valentina is already a member of Layers workspace';
    
    -- Update role to owner if needed
    UPDATE workspace_members
    SET role = 'owner'
    WHERE workspace_id = layers_workspace_id 
    AND user_id = valentina_user_id
    AND role != 'owner';
    
    IF FOUND THEN
      RAISE NOTICE '✓ Updated Valentina role to owner';
    END IF;
  ELSE
    -- Add as member with owner role
    INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
    VALUES (layers_workspace_id, valentina_user_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';
    
    RAISE NOTICE '✓ Added Valentina as member of Layers workspace with owner role';
  END IF;
  
  -- Verify final status
  SELECT 
    wm.role,
    w.name as workspace_name,
    p.email as user_email
  INTO existing_member  -- Reuse variable for verification
  FROM workspace_members wm
  JOIN workspaces w ON wm.workspace_id = w.id
  JOIN profiles p ON wm.user_id = p.id
  WHERE wm.workspace_id = layers_workspace_id
  AND wm.user_id = valentina_user_id;
  
  RAISE NOTICE '✓ Final status: Valentina is member of % with role: owner', layers_workspace_id;
  
END $$;

-- Verify it worked
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

