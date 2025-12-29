-- Migration: Allow profile insertion for new users
-- Purpose: Ensure RLS policies allow profile creation for new users
-- This fixes the registration error by allowing profile creation via service_role

-- Check if there's a policy blocking service_role from inserting profiles
-- If not, create one that allows service_role to insert profiles

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create policy that allows service_role (used by API) to insert profiles
-- This is needed for the /api/auth/create-profile endpoint
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also ensure authenticated users can insert their own profile
-- This might be needed if user is created and immediately authenticated
DROP POLICY IF EXISTS "Users can insert own profile on signup" ON profiles;

CREATE POLICY "Users can insert own profile on signup" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Note: The API endpoint /api/auth/create-profile uses service_role
-- which should now be able to insert profiles without RLS blocking it

