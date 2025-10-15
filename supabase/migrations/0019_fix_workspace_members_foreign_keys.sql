-- Fix workspace_members foreign key constraints
-- This migration ensures proper relationships between workspace_members and profiles tables

-- First, check if the foreign key constraint already exists
DO $$
BEGIN
    -- Add foreign key constraint for user_id -> profiles.id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'workspace_members_user_id_fkey' 
        AND table_name = 'workspace_members'
    ) THEN
        ALTER TABLE workspace_members 
        ADD CONSTRAINT workspace_members_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key constraint for workspace_id -> workspaces.id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'workspace_members_workspace_id_fkey' 
        AND table_name = 'workspace_members'
    ) THEN
        ALTER TABLE workspace_members 
        ADD CONSTRAINT workspace_members_workspace_id_fkey 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verify the constraints were created
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'workspace_members';
