-- Script: Check René Moravec current status
-- Purpose: Check if René is already admin and workspace owner

-- Check René's profile and role
SELECT 'René Profile Status:' as info, 
       id, 
       email, 
       display_name, 
       role,
       created_at,
       updated_at
FROM profiles 
WHERE email ILIKE '%rene%renemoravec%' 
   OR email ILIKE '%design@renemoravec%'
   OR email ILIKE '%rene@renemoravec%'
   OR (email ILIKE '%rene%' AND email ILIKE '%renemoravec%')
ORDER BY 
    CASE 
        WHEN email = 'rene@renemoravec.sk' THEN 1
        WHEN email = 'design@renemoravec.sk' THEN 2
        ELSE 3
    END;

-- Check if is_admin function exists and test it for René
DO $$
DECLARE
    rene_user_id UUID;
    is_admin_result BOOLEAN;
    rene_email TEXT;
    rene_role TEXT;
BEGIN
    -- Find René's user ID and details
    SELECT id, email, role INTO rene_user_id, rene_email, rene_role
    FROM profiles 
    WHERE email ILIKE '%rene%renemoravec%' 
       OR email ILIKE '%design@renemoravec%'
       OR email ILIKE '%rene@renemoravec%'
    ORDER BY 
        CASE 
            WHEN email = 'rene@renemoravec.sk' THEN 1
            WHEN email = 'design@renemoravec.sk' THEN 2
            ELSE 3
        END
    LIMIT 1;
    
    IF rene_user_id IS NOT NULL THEN
        RAISE NOTICE '=== RENÉ STATUS CHECK ===';
        RAISE NOTICE 'User ID: %', rene_user_id;
        RAISE NOTICE 'Email: %', rene_email;
        RAISE NOTICE 'Current Role: %', rene_role;
        
        -- Check if is_admin function exists
        IF EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'is_admin'
        ) THEN
            -- Test is_admin function
            BEGIN
                SELECT is_admin(rene_user_id) INTO is_admin_result;
                RAISE NOTICE 'is_admin() function result: %', is_admin_result;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error calling is_admin(): %', SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'is_admin function does NOT exist in database';
        END IF;
        
        -- Manual check: is role = 'admin'?
        IF rene_role = 'admin' THEN
            RAISE NOTICE '✅ René HAS role = ''admin'' in profiles table';
        ELSE
            RAISE NOTICE '❌ René does NOT have role = ''admin'' (current role: %)', rene_role;
        END IF;
    ELSE
        RAISE NOTICE '❌ René not found in profiles table';
    END IF;
END $$;

-- Check workspace ownership
SELECT 'René Workspace Ownership:' as info,
       w.id as workspace_id,
       w.name as workspace_name,
       w.owner_id,
       p.email as owner_email,
       p.display_name as owner_name,
       p.role as owner_role
FROM workspaces w
LEFT JOIN profiles p ON w.owner_id = p.id
WHERE p.email ILIKE '%rene%renemoravec%' 
   OR p.email ILIKE '%design@renemoravec%'
   OR p.email ILIKE '%rene@renemoravec%'
   OR w.owner_id IN (
       SELECT id FROM profiles 
       WHERE email ILIKE '%rene%renemoravec%' 
          OR email ILIKE '%design@renemoravec%'
          OR email ILIKE '%rene@renemoravec%'
   );

-- Check workspace membership
SELECT 'René Workspace Memberships:' as info,
       wm.workspace_id,
       w.name as workspace_name,
       wm.user_id,
       wm.role as membership_role,
       p.email,
       p.display_name,
       p.role as profile_role
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
JOIN workspaces w ON wm.workspace_id = w.id
WHERE p.email ILIKE '%rene%renemoravec%' 
   OR p.email ILIKE '%design@renemoravec%'
   OR p.email ILIKE '%rene@renemoravec%';

-- Check all workspaces to see current state
SELECT 'All Workspaces:' as info,
       w.id,
       w.name,
       w.owner_id,
       p.email as owner_email,
       p.display_name as owner_name,
       p.role as owner_role
FROM workspaces w
LEFT JOIN profiles p ON w.owner_id = p.id
ORDER BY w.created_at DESC;

