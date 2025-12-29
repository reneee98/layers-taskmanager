-- Script: Create is_admin function if it doesn't exist
-- Purpose: Create database function to check if user is admin
-- This function is used by the API to check admin status

-- Drop function if exists (to recreate it)
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Create is_admin function
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has role = 'admin' in profiles table
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = uid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION is_admin IS 'Check if a user is an admin (has role = ''admin'' in profiles table)';

-- Test the function (optional - remove if you don't want to test)
-- SELECT 'Testing is_admin function:' as info;
-- SELECT id, email, role, is_admin(id) as is_admin_result
-- FROM profiles
-- WHERE email ILIKE '%rene%renemoravec%' 
--    OR email ILIKE '%design@renemoravec%'
--    OR email ILIKE '%rene@renemoravec%'
-- LIMIT 5;

