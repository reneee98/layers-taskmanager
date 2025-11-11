-- Check current RLS policies on projects table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;

-- Check if is_workspace_member function exists and its definition
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('is_workspace_member', 'is_workspace_owner')
ORDER BY p.proname;
