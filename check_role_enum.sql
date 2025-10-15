-- Check user_role enum values
SELECT unnest(enum_range(NULL::user_role)) as role_values;

-- Check current workspace_members roles
SELECT DISTINCT role, COUNT(*) as count
FROM workspace_members 
WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
GROUP BY role;
