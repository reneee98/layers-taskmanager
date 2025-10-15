-- Fix workspace_members role constraint
-- Simple migration to fix role constraint issues

-- Drop existing constraint
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;

-- Add new constraint
ALTER TABLE workspace_members 
ADD CONSTRAINT workspace_members_role_check 
CHECK (role IN ('owner', 'member'));

-- Update any invalid role values
UPDATE workspace_members 
SET role = 'member' 
WHERE role NOT IN ('owner', 'member');
