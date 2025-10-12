-- URGENT SECURITY FIX: Remove orphaned Layers workspace
-- This will fix the security issue where test users can see Layers workspace

-- 1. First, let's see what we have
SELECT 
    'BEFORE CLEANUP' as status,
    w.id,
    w.name,
    w.owner_id,
    u.email as owner_email
FROM public.workspaces w
LEFT JOIN auth.users u ON u.id = w.owner_id
WHERE w.name LIKE '%Layers%';

-- 2. Delete orphaned Layers workspaces (workspaces with no valid owner)
DELETE FROM public.workspaces 
WHERE name LIKE '%Layers%' 
AND (owner_id IS NULL OR owner_id NOT IN (SELECT id FROM auth.users));

-- 3. Show what's left after cleanup
SELECT 
    'AFTER CLEANUP' as status,
    w.id,
    w.name,
    w.owner_id,
    u.email as owner_email
FROM public.workspaces w
LEFT JOIN auth.users u ON u.id = w.owner_id
WHERE w.name LIKE '%Layers%';

-- 4. Show all workspaces after cleanup
SELECT 
    'ALL WORKSPACES AFTER CLEANUP' as status,
    w.id,
    w.name,
    w.owner_id,
    u.email as owner_email
FROM public.workspaces w
LEFT JOIN auth.users u ON u.id = w.owner_id
ORDER BY w.created_at;
