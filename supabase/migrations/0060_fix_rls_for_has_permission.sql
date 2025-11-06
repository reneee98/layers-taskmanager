-- Migration: Fix RLS policies to allow has_permission function to access role tables
-- Purpose: Ensure has_permission function can read role and permission data even with RLS enabled

-- Note: The has_permission function is SECURITY DEFINER, which means it runs with the privileges
-- of the function owner (postgres superuser) and should automatically bypass RLS.
-- However, to be safe and ensure the function works correctly, we'll update the policies
-- to allow users to read their own role and permission data.

-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Admins can view all roles" ON roles;
DROP POLICY IF EXISTS "Admins can view all permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can view role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admins can view user_roles" ON user_roles;

-- Allow all authenticated users to read roles (needed for has_permission function)
-- This is safe because roles are just metadata, not sensitive user data
CREATE POLICY "Authenticated users can view roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to read permissions (needed for has_permission function)
-- This is safe because permissions are just metadata
CREATE POLICY "Authenticated users can view permissions" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to read role_permissions (needed for has_permission function)
CREATE POLICY "Authenticated users can view role_permissions" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to read their own user_roles and role_permissions for their workspaces
-- This allows the has_permission function to check user permissions
CREATE POLICY "Users can view their own user_roles" ON user_roles
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR
      -- Allow if user is checking permissions for their workspace
      workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

-- Note: The existing admin-only policies for INSERT/UPDATE/DELETE remain in place.
-- Only admins can manage roles, permissions, role_permissions, and user_roles.

