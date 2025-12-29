-- Verify RLS is enabled and policies are correct
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'workspace_members'
  AND schemaname = 'public';

-- List all policies on workspace_members
SELECT 
    'Current Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'workspace_members'
ORDER BY policyname;

-- Test if regular user can insert themselves (this should FAIL if RLS works)
-- Replace {TEST_USER_ID} with a test user ID that is NOT owner of Layers workspace
-- SELECT current_user;
-- 
-- This would be the test - but we need a test user ID first:
-- INSERT INTO workspace_members (workspace_id, user_id, role)
-- VALUES ('6dd7d31a-3d36-4d92-a8eb-7146703a00b0', '{TEST_USER_ID}', 'member');
-- 
-- If RLS works, this should fail with: new row violates row-level security policy

