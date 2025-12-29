-- Test script to verify permissions for "dizajner" role
-- Run this in Supabase SQL editor to check if permissions are working correctly

-- 1. Find the "dizajner" role
SELECT 
    id,
    name,
    description,
    is_system_role
FROM roles
WHERE name = 'dizajner';

-- 2. Check what permissions the "dizajner" role has
SELECT 
    r.name as role_name,
    p.resource,
    p.action,
    p.name as permission_name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'dizajner'
ORDER BY p.resource, p.action;

-- 3. Find users with "dizajner" role (e.g., Harry Potter)
SELECT 
    ur.user_id,
    ur.role_id,
    ur.workspace_id,
    r.name as role_name,
    p.email,
    p.display_name,
    w.name as workspace_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN profiles p ON ur.user_id = p.id
JOIN workspaces w ON ur.workspace_id = w.id
WHERE r.name = 'dizajner';

-- 4. Test has_permission function for a specific user with "dizajner" role
-- Replace USER_ID_HERE with actual user ID from step 3
-- Replace WORKSPACE_ID_HERE with actual workspace ID from step 3
/*
SELECT 
    has_permission(
        'USER_ID_HERE'::UUID,
        'projects',
        'read',
        'WORKSPACE_ID_HERE'::UUID
    ) as can_read_projects,
    has_permission(
        'USER_ID_HERE'::UUID,
        'tasks',
        'read',
        'WORKSPACE_ID_HERE'::UUID
    ) as can_read_tasks,
    has_permission(
        'USER_ID_HERE'::UUID,
        'financial',
        'view_prices',
        'WORKSPACE_ID_HERE'::UUID
    ) as can_view_prices;
*/

-- 5. Check if user has custom role (should return TRUE if user has "dizajner" role)
-- Replace USER_ID_HERE and WORKSPACE_ID_HERE
/*
SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = 'USER_ID_HERE'::UUID
      AND ur.workspace_id = 'WORKSPACE_ID_HERE'::UUID
) as has_custom_role;
*/

-- 6. Check what system role user has in workspace_members (should be 'member' if custom role exists)
-- Replace USER_ID_HERE and WORKSPACE_ID_HERE
/*
SELECT 
    role,
    workspace_id
FROM workspace_members
WHERE user_id = 'USER_ID_HERE'::UUID
  AND workspace_id = 'WORKSPACE_ID_HERE'::UUID;
*/

