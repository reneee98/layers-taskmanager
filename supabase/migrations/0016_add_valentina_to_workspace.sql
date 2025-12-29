-- Migration: Add Valentina Bušová to workspace as member
-- Purpose: Ensure Valentina can assign tasks to René

-- First, let's check if Valentina exists in profiles
SELECT 'Valentina profile check:' as info, id, email, display_name, role 
FROM profiles 
WHERE email ILIKE '%valentina%' OR email ILIKE '%bušová%' OR email ILIKE '%busova%';

-- Check current workspace members
SELECT 'Current workspace members:' as info, wm.user_id, wm.role, p.email, p.display_name
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Find Valentina's user ID by email pattern
-- Assuming her email might be valentina@renemoravec.sk or similar
DO $$
DECLARE
    valentina_user_id UUID;
    workspace_id UUID := '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';
BEGIN
    -- Try to find Valentina by email patterns
    SELECT id INTO valentina_user_id
    FROM profiles 
    WHERE email ILIKE '%valentina%' 
       OR email ILIKE '%bušová%' 
       OR email ILIKE '%busova%'
       OR display_name ILIKE '%valentina%'
       OR display_name ILIKE '%bušová%'
       OR display_name ILIKE '%busova%'
    LIMIT 1;
    
    IF valentina_user_id IS NOT NULL THEN
        -- Check if she's already a member
        IF NOT EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = workspace_id AND user_id = valentina_user_id
        ) THEN
            -- Add her as a member
            INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
            VALUES (workspace_id, valentina_user_id, 'member', NOW());
            
            RAISE NOTICE 'Added Valentina (user_id: %) to workspace as member', valentina_user_id;
        ELSE
            RAISE NOTICE 'Valentina (user_id: %) is already a member of the workspace', valentina_user_id;
        END IF;
    ELSE
        RAISE NOTICE 'Valentina not found in profiles table';
    END IF;
END $$;

-- Verify the addition
SELECT 'Updated workspace members:' as info, wm.user_id, wm.role, p.email, p.display_name
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Also ensure RLS is disabled for development (as per migration 0013)
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Check RLS status
SELECT 'RLS Status:' as info, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tasks', 'task_assignees', 'workspace_members', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename;
