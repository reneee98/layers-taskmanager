-- Migration: Add UPDATE policy for bugs table
-- Purpose: Allow superadmin to update bug reports (mark as resolved)

-- Policy: Only superadmin can update bugs
-- Superadmin is identified by email (René Moravec)
CREATE POLICY "Superadmin can update bugs"
ON bugs
FOR UPDATE
TO authenticated
USING (
  auth.email() = 'design@renemoravec.sk' OR
  auth.email() = 'rene@renemoravec.sk'
)
WITH CHECK (
  auth.email() = 'design@renemoravec.sk' OR
  auth.email() = 'rene@renemoravec.sk'
);

-- Grant UPDATE permission
GRANT UPDATE ON bugs TO authenticated;

