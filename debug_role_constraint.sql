-- Check workspace_members role constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'workspace_members'::regclass 
AND contype = 'c'
AND conname LIKE '%role%';

-- Check current role values in workspace_members
SELECT DISTINCT role, COUNT(*) as count
FROM workspace_members 
GROUP BY role;

-- Check if there's a role column with specific values
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'workspace_members' 
AND column_name = 'role';
