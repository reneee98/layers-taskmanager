-- Find the exact trigger and function name that adds users to Layers workspace
-- Run this to identify what needs to be dropped

-- 1. Find triggers on auth.users
SELECT 
    'Triggers on auth.users' as check_type,
    trigger_schema,
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- 2. Find functions that might be called by these triggers
SELECT 
    'Functions that add to Layers workspace' as check_type,
    routine_schema,
    routine_name,
    routine_type,
    substring(routine_definition, 1, 500) as definition_preview
FROM information_schema.routines
WHERE (
    routine_definition LIKE '%Layers s.r.o.%'
    OR routine_definition LIKE '%Layers workspace%'
)
AND (
    routine_definition LIKE '%workspace_members%'
    OR routine_definition LIKE '%INSERT INTO public.workspace_members%'
)
ORDER BY routine_schema, routine_name;

-- 3. Find trigger-function mappings
SELECT 
    'Trigger-Function Mappings' as check_type,
    t.trigger_schema,
    t.trigger_name,
    t.event_object_table,
    pg_get_functiondef(p.oid) as function_definition
FROM information_schema.triggers t
JOIN pg_trigger tg ON tg.tgname = t.trigger_name
JOIN pg_proc p ON p.oid = tg.tgfoid
WHERE t.event_object_schema = 'auth'
  AND t.event_object_table = 'users';

