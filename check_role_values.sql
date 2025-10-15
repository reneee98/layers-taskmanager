-- Check what role values exist in workspace_members
SELECT DISTINCT role, COUNT(*) as count
FROM workspace_members 
GROUP BY role;

-- Check the role column constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'workspace_members'::regclass 
AND contype = 'c'
AND conname LIKE '%role%';
