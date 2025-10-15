-- Check if update_user_workspace_role function exists
SELECT proname, proargtypes, prorettype 
FROM pg_proc 
WHERE proname = 'update_user_workspace_role';

-- Check what functions exist with 'user' and 'role' in name
SELECT proname, proargtypes, prorettype 
FROM pg_proc 
WHERE proname LIKE '%user%' AND proname LIKE '%role%';
