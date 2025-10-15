-- Check workspace_members table structure and constraints
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'workspace_members' 
ORDER BY ordinal_position;

-- Check check constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'workspace_members'::regclass 
AND contype = 'c';
