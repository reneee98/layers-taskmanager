-- Migration: Remove 'user' role and migrate existing users to 'member'
-- Purpose: Remove the 'user' role and migrate all users with 'user' role to 'member'

-- First, migrate all profiles with 'user' role to 'member'
UPDATE profiles
SET role = 'member'
WHERE role = 'user';

-- Migrate all workspace_members with 'user' role to 'member'
UPDATE workspace_members
SET role = 'member'
WHERE role = 'user';

-- Delete the 'user' role from roles table
DELETE FROM roles
WHERE name = 'user';

-- Delete any user_roles entries that reference the deleted 'user' role
DELETE FROM user_roles
WHERE role_id IN (SELECT id FROM roles WHERE name = 'user');

-- Note: The 'user' role permissions were already removed in migration 0059,
-- so we just need to clean up the role itself and migrate existing data.

