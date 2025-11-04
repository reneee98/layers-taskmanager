-- Migration: Add UPDATE policy for bugs table
-- Purpose: Allow superadmin to update bug reports (mark as resolved)

-- Policy: Only superadmin can update bugs
CREATE POLICY "Superadmin can update bugs"
ON bugs
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'app_role')::text = 'superadmin' OR
  is_superadmin(auth.uid())
)
WITH CHECK (
  (auth.jwt() ->> 'app_role')::text = 'superadmin' OR
  is_superadmin(auth.uid())
);

-- Grant UPDATE permission
GRANT UPDATE ON bugs TO authenticated;

