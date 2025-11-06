-- Script: Set René Moravec as Administrator and Workspace Owner
-- Purpose: Manually set René Moravec as admin in profiles and owner of his workspace
-- Date: 2025-01-XX

-- First, let's check René's current status
SELECT 'René profile check:' as info, id, email, display_name, role 
FROM profiles 
WHERE email ILIKE '%rene%' 
   OR email ILIKE '%renemoravec%'
   OR display_name ILIKE '%rene%'
   OR display_name ILIKE '%moravec%';

-- Check current workspaces and their owners
SELECT 'Current workspaces:' as info, id, name, owner_id, p.email as owner_email, p.display_name as owner_name
FROM workspaces w
LEFT JOIN profiles p ON w.owner_id = p.id;

-- Find René's user ID and update his role to admin
DO $$
DECLARE
    rene_user_id UUID;
    workspace_id UUID;
BEGIN
    -- Try to find René by email patterns
    SELECT id INTO rene_user_id
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
        END
    LIMIT 1;
    
    IF rene_user_id IS NOT NULL THEN
        -- Update René's role to admin
        UPDATE profiles
        SET role = 'admin',
            updated_at = NOW()
        WHERE id = rene_user_id;
        
        RAISE NOTICE 'Updated René (user_id: %) role to admin', rene_user_id;
        
        -- Find or create workspace for René
        -- First, try to find existing workspace where René is owner
        SELECT id INTO workspace_id
        FROM workspaces
        WHERE owner_id = rene_user_id
        LIMIT 1;
        
        -- If no workspace found, try to find any workspace and set René as owner
        IF workspace_id IS NULL THEN
            SELECT id INTO workspace_id
            FROM workspaces
            ORDER BY created_at ASC
            LIMIT 1;
            
            IF workspace_id IS NOT NULL THEN
                -- Update workspace to set René as owner
                UPDATE workspaces
                SET owner_id = rene_user_id,
                    updated_at = NOW()
                WHERE id = workspace_id;
                
                RAISE NOTICE 'Set René (user_id: %) as owner of workspace %', rene_user_id, workspace_id;
            ELSE
                -- Create new workspace for René
                INSERT INTO workspaces (name, description, owner_id, created_at, updated_at)
                VALUES (
                    'René Moravec Workspace',
                    'Hlavný workspace pre René Moravec',
                    rene_user_id,
                    NOW(),
                    NOW()
                )
                RETURNING id INTO workspace_id;
                
                RAISE NOTICE 'Created new workspace % for René (user_id: %)', workspace_id, rene_user_id;
            END IF;
        ELSE
            RAISE NOTICE 'René (user_id: %) is already owner of workspace %', rene_user_id, workspace_id;
        END IF;
        
        -- Ensure René is a member of the workspace (if not already)
        IF NOT EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = workspace_id AND user_id = rene_user_id
        ) THEN
            INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
            VALUES (workspace_id, rene_user_id, 'owner', NOW())
            ON CONFLICT (workspace_id, user_id) DO UPDATE SET
                role = 'owner',
                updated_at = NOW();
            
            RAISE NOTICE 'Added René (user_id: %) to workspace % as owner member', rene_user_id, workspace_id;
        ELSE
            -- Update existing membership to owner
            UPDATE workspace_members
            SET role = 'owner',
                updated_at = NOW()
            WHERE workspace_id = workspace_id AND user_id = rene_user_id;
            
            RAISE NOTICE 'Updated René (user_id: %) membership in workspace % to owner', rene_user_id, workspace_id;
        END IF;
        
    ELSE
        RAISE NOTICE 'René not found in profiles table. Please check the email address.';
    END IF;
END $$;

-- Verify the changes
SELECT 'Updated René profile:' as info, id, email, display_name, role 
FROM profiles 
WHERE email ILIKE '%rene%renemoravec%' 
   OR email ILIKE '%design@renemoravec%'
   OR email ILIKE '%rene@renemoravec%';

-- Verify workspace ownership
SELECT 'René workspaces:' as info, w.id, w.name, w.owner_id, p.email as owner_email, p.display_name as owner_name
FROM workspaces w
JOIN profiles p ON w.owner_id = p.id
WHERE p.email ILIKE '%rene%renemoravec%' 
   OR p.email ILIKE '%design@renemoravec%'
   OR p.email ILIKE '%rene@renemoravec%';

-- Verify workspace membership
SELECT 'René workspace memberships:' as info, wm.workspace_id, w.name as workspace_name, wm.user_id, wm.role, p.email, p.display_name
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
JOIN workspaces w ON wm.workspace_id = w.id
WHERE p.email ILIKE '%rene%renemoravec%' 
   OR p.email ILIKE '%design@renemoravec%'
   OR p.email ILIKE '%rene@renemoravec%';

