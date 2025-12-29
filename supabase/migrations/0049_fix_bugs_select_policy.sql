-- Migration: Fix bugs SELECT RLS policy
-- Purpose: Ensure superadmin can see all bugs

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Superadmin can select bugs" ON bugs;

-- Create new SELECT policy that uses function (which has SECURITY DEFINER)
-- This avoids direct access to auth.users table
CREATE POLICY "Superadmin can select bugs"
ON bugs
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'app_role')::text = 'superadmin' OR
  is_superadmin(auth.uid())
);

