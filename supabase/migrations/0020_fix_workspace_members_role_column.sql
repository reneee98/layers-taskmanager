-- Fix workspace_members role column
-- This migration ensures the role column accepts 'owner' and 'member' values

-- First, check current role values
SELECT 'Current role values:' as info, role, COUNT(*) as count
FROM workspace_members 
GROUP BY role;

-- Check if there's a role constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'workspace_members'::regclass 
AND contype = 'c'
AND conname LIKE '%role%';

-- Drop existing role constraint if it exists
DO $$
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'workspace_members'::regclass 
        AND contype = 'c'
        AND conname LIKE '%role%'
    ) THEN
        ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
    END IF;
END $$;

-- Add new constraint that allows 'owner' and 'member'
ALTER TABLE workspace_members 
ADD CONSTRAINT workspace_members_role_check 
CHECK (role IN ('owner', 'member'));

-- Update any existing 'admin' values to 'owner'
UPDATE workspace_members 
SET role = 'owner' 
WHERE role = 'admin';

-- Verify the constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'workspace_members'::regclass 
AND contype = 'c'
AND conname LIKE '%role%';

-- Check final role values
SELECT 'Final role values:' as info, role, COUNT(*) as count
FROM workspace_members 
GROUP BY role;
