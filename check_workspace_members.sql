-- Check all members of Layers workspace
SELECT 
    wm.id,
    wm.user_id,
    wm.workspace_id,
    wm.role,
    wm.created_at,
    p.email,
    p.display_name
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
ORDER BY wm.created_at DESC;

-- Check RLS policies on workspace_members
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'workspace_members'
ORDER BY policyname;

-- Check if RLS is actually enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'workspace_members'
  AND schemaname = 'public';

-- Check if there's a function that automatically adds users
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (pg_get_functiondef(p.oid) LIKE '%workspace_members%' 
       OR pg_get_functiondef(p.oid) LIKE '%INSERT INTO workspace_members%'
       OR pg_get_functiondef(p.oid) LIKE '%workspace_members%INSERT%');

