-- Check current functions
SELECT proname, proargtypes, prorettype 
FROM pg_proc 
WHERE proname IN ('update_user_workspace_role', 'get_workspace_members', 'add_user_to_workspace_with_role', 'remove_user_from_workspace');
