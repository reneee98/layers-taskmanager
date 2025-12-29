-- Migration: Add DELETE policy for bugs table
-- Purpose: Allow superadmin to delete bug reports

-- Policy: Only superadmin can delete bugs
-- Superadmin is identified by email (René Moravec)
CREATE POLICY "Superadmin can delete bugs"
ON bugs
FOR DELETE
TO authenticated
USING (
  auth.email() = 'design@renemoravec.sk' OR
  auth.email() = 'rene@renemoravec.sk'
);

-- Grant DELETE permission
GRANT DELETE ON bugs TO authenticated;

