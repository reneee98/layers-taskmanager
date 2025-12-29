-- Check ALL triggers in the database
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_schema IN ('public', 'auth')
ORDER BY event_object_table, trigger_name;

-- Check specifically for triggers that might insert into workspace_members
SELECT 
    'Triggers that might affect workspace_members' as info,
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE action_statement LIKE '%workspace_members%'
   OR action_statement LIKE '%INSERT INTO workspace_members%'
   OR action_statement LIKE '%workspace_members%INSERT%';

-- Check for triggers on auth.users
SELECT 
    'Triggers on auth.users table' as info,
    trigger_name,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- Check for triggers on profiles table
SELECT 
    'Triggers on profiles table' as info,
    trigger_name,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'profiles';

