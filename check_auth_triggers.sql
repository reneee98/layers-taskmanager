-- Check for triggers on auth.users table (this is where new users are created)
-- Note: You might need superuser privileges to see auth schema triggers
SELECT 
    'Triggers on auth.users table' as info,
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- Check for all functions that might insert into workspace_members
SELECT 
    'Functions that might insert into workspace_members' as info,
    routine_schema,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition LIKE '%workspace_members%'
    OR routine_definition LIKE '%INSERT INTO workspace_members%'
  )
ORDER BY routine_name;

-- Check for any trigger that executes functions containing workspace_members
SELECT 
    'Triggers executing functions with workspace_members' as info,
    t.trigger_schema,
    t.trigger_name,
    t.event_object_table,
    t.action_statement,
    r.routine_name,
    r.routine_definition
FROM information_schema.triggers t
LEFT JOIN information_schema.routines r 
  ON r.routine_name = substring(t.action_statement from 'EXECUTE FUNCTION ([^(]+)')
WHERE t.action_statement LIKE '%workspace_members%'
   OR (r.routine_definition IS NOT NULL AND r.routine_definition LIKE '%workspace_members%')
ORDER BY t.trigger_name;

