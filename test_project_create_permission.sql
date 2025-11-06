-- Test script to check why project creation is failing
-- Run this in Supabase SQL editor

-- 1. Check if user has 'projects.create' permission
-- Replace USER_ID_HERE and WORKSPACE_ID_HERE with actual values
/*
SELECT 
    has_permission(
        'USER_ID_HERE'::UUID,
        'projects',
        'create',
        'WORKSPACE_ID_HERE'::UUID
    ) as can_create_projects;
*/

-- 2. Check what permissions user has for projects
-- Replace USER_ID_HERE and WORKSPACE_ID_HERE
/*
SELECT 
    p.resource,
    p.action,
    has_permission(
        'USER_ID_HERE'::UUID,
        p.resource,
        p.action,
        'WORKSPACE_ID_HERE'::UUID
    ) as has_perm
FROM permissions p
WHERE p.resource = 'projects'
ORDER BY p.action;
*/

-- 3. Check if user has custom role
-- Replace USER_ID_HERE and WORKSPACE_ID_HERE
/*
SELECT 
    ur.user_id,
    ur.role_id,
    r.name as role_name,
    COUNT(rp.permission_id) as permission_count
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE ur.user_id = 'USER_ID_HERE'::UUID
  AND ur.workspace_id = 'WORKSPACE_ID_HERE'::UUID
GROUP BY ur.user_id, ur.role_id, r.name;
*/

-- 4. Check what 'member' role has for projects (for comparison)
SELECT 
    r.name as role_name,
    p.resource,
    p.action,
    p.name as permission_name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'member'
  AND p.resource = 'projects'
ORDER BY p.action;

