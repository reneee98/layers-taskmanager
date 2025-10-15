-- Simple fix for workspace_members role column
-- Change role column to text to avoid constraint issues

-- First, drop the existing constraint if it exists
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;

-- Change role column to text
ALTER TABLE workspace_members ALTER COLUMN role TYPE text;

-- Add a simple check constraint for valid roles
ALTER TABLE workspace_members 
ADD CONSTRAINT workspace_members_role_check 
CHECK (role IN ('owner', 'member'));

-- Update any existing invalid role values
UPDATE workspace_members 
SET role = 'member' 
WHERE role NOT IN ('owner', 'member');

-- Verify the changes
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'workspace_members'::regclass 
AND contype = 'c'
AND conname LIKE '%role%';
