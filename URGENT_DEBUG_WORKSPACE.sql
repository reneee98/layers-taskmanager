-- URGENT DEBUG: Find why test users can see Layers workspace
-- Run this in Supabase SQL Editor

-- 1. Check all workspaces and their owners
SELECT 
    'ALL WORKSPACES' as check_type,
    w.id,
    w.name,
    w.owner_id,
    u.email as owner_email,
    CASE 
        WHEN u.id IS NULL THEN 'ORPHANED - No valid owner'
        WHEN u.email = 'design@renemoravec.sk' THEN 'VALID - René owner'
        ELSE 'VALID - Other owner'
    END as status
FROM public.workspaces w
LEFT JOIN auth.users u ON u.id = w.owner_id
ORDER BY w.created_at;

-- 2. Check workspace_members table for Layers workspace
SELECT 
    'LAYERS WORKSPACE MEMBERS' as check_type,
    w.id as workspace_id,
    w.name as workspace_name,
    w.owner_id as workspace_owner,
    wm.user_id,
    u.email as member_email,
    wm.role,
    wm.created_at
FROM public.workspaces w
LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN auth.users u ON u.id = wm.user_id
WHERE w.name LIKE '%Layers%'
ORDER BY wm.created_at;

-- 3. Check if there are any orphaned Layers workspaces
SELECT 
    'ORPHANED LAYERS WORKSPACES' as check_type,
    w.id,
    w.name,
    w.owner_id,
    w.created_at
FROM public.workspaces w
WHERE w.name LIKE '%Layers%' 
AND (w.owner_id IS NULL OR w.owner_id NOT IN (SELECT id FROM auth.users));

-- 4. Check RLS policies for workspaces table
SELECT 
    'RLS POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'workspaces'
ORDER BY policyname;
