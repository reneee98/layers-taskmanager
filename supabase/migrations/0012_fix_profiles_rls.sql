-- Migration: Fix profiles RLS policies
-- Purpose: Allow users to access their profiles and fix 500 errors

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Owners can manage all profiles" ON profiles;

-- Create simple policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Workspace owners can view all profiles in their workspaces
CREATE POLICY "Owners can view workspace profiles" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT user_id 
      FROM workspace_members 
      WHERE workspace_id IN (
        SELECT id 
        FROM workspaces 
        WHERE owner_id = auth.uid()
      )
    )
  );

-- Check if profiles exist
SELECT COUNT(*) as profile_count FROM profiles;

-- Check if user profile exists
SELECT 'User profile exists:' as info, COUNT(*) as count 
FROM profiles 
WHERE id = '775560ca-adfa-4df2-9768-6ea553494e1f';

-- Add comment for documentation
COMMENT ON TABLE profiles IS 'Profiles table with RLS enabled - users can manage own profile, owners can view workspace profiles';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';
