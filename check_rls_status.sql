-- Kontrola RLS politík pre všetky hlavné tabuľky

-- 1. Skontrolujte či je RLS zapnutý na všetkých tabuľkách
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'tasks',
    'time_entries',
    'task_assignees',
    'task_comments',
    'task_timers',
    'projects',
    'clients',
    'workspace_members',
    'workspaces',
    'invoices',
    'costs',
    'bugs'
  )
ORDER BY tablename;

-- 2. Zoznam všetkých aktívnych RLS politík
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as "Operation"
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Kontrola helper funkcií
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_workspace_owner',
    'is_workspace_member',
    'get_task_workspace'
  )
ORDER BY routine_name;

-- 4. Testovanie workspace membership pre aktuálneho užívateľa
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  wm.user_id,
  wm.role,
  w.owner_id,
  CASE 
    WHEN w.owner_id = auth.uid() THEN 'Owner'
    WHEN wm.user_id IS NOT NULL THEN 'Member'
    ELSE 'No Access'
  END as access_level
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = auth.uid()
WHERE w.owner_id = auth.uid() OR wm.user_id = auth.uid()
ORDER BY w.name;

