DO $$
DECLARE
  valentina_user_id UUID;
  layers_workspace_id UUID := '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'::UUID;
  is_member BOOLEAN := FALSE;
BEGIN
  SELECT id INTO valentina_user_id
  FROM profiles
  WHERE email ILIKE '%valentina%busova%' 
     OR email ILIKE '%valentina%' 
     OR display_name ILIKE '%valentina%'
  LIMIT 1;
  
  IF valentina_user_id IS NULL THEN
    RAISE EXCEPTION 'Valentina user not found';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = layers_workspace_id AND user_id = valentina_user_id
  ) INTO is_member;
  
  IF NOT is_member THEN
    INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
    VALUES (layers_workspace_id, valentina_user_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';
    RAISE NOTICE 'Added Valentina as member of Layers workspace';
  ELSE
    UPDATE workspace_members
    SET role = 'owner'
    WHERE workspace_id = layers_workspace_id AND user_id = valentina_user_id AND role != 'owner';
    RAISE NOTICE 'Valentina already has access';
  END IF;
END $$;
