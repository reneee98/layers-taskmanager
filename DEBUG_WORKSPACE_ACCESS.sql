-- Debug script to check workspace access issues
-- This will help us understand why test users can see Layers workspace

-- 1. Check all workspaces and their owners
SELECT 
    w.id,
    w.name,
    w.owner_id,
    u.email as owner_email,
    CASE 
        WHEN u.id IS NULL THEN 'ORPHANED - No valid owner'
        ELSE 'Valid owner'
    END as status
FROM public.workspaces w
LEFT JOIN auth.users u ON u.id = w.owner_id
ORDER BY w.created_at;

-- 2. Check if there are any workspaces with NULL owner_id
SELECT 
    id,
    name,
    owner_id,
    created_at
FROM public.workspaces 
WHERE owner_id IS NULL;

-- 3. Check if there are any workspaces with invalid owner_id (not in auth.users)
SELECT 
    w.id,
    w.name,
    w.owner_id,
    w.created_at
FROM public.workspaces w
LEFT JOIN auth.users u ON u.id = w.owner_id
WHERE u.id IS NULL AND w.owner_id IS NOT NULL;

-- 4. Check workspace_members table for any suspicious entries
SELECT 
    wm.workspace_id,
    w.name as workspace_name,
    w.owner_id as workspace_owner,
    wm.user_id,
    u.email as member_email,
    wm.role
FROM public.workspace_members wm
JOIN public.workspaces w ON w.id = wm.workspace_id
LEFT JOIN auth.users u ON u.id = wm.user_id
WHERE w.name LIKE '%Layers%'
ORDER BY wm.created_at;

-- 5. Check if there are any RLS policies that might be too permissive
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
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, policyname;
