-- Migration: Fix bugs RLS policy for INSERT
-- Purpose: Update existing INSERT policy to ensure it works correctly with auth.uid()

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert bugs" ON bugs;

-- Create new INSERT policy that allows authenticated users to insert their own bugs
-- The user_id must match auth.uid() to ensure users can only insert bugs for themselves
-- Using simple check like other tables (profiles, etc.)
CREATE POLICY "Users can insert bugs"
ON bugs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

