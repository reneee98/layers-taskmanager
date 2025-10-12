-- DISTRIBUTE ACTIVITIES PROPERLY - Spustite toto v Supabase SQL Editor

-- 1. Najprv skontroluj workspace members
SELECT 'WORKSPACE MEMBERS:' as info;
SELECT wm.user_id, p.display_name, p.email 
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 2. Získaj ID všetkých používateľov vo workspace
WITH workspace_users AS (
  SELECT wm.user_id, p.display_name, p.email,
         ROW_NUMBER() OVER (ORDER BY wm.created_at) as user_order
  FROM workspace_members wm
  LEFT JOIN profiles p ON wm.user_id = p.id
  WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
)
-- 3. Rozdeľ projekty medzi rôznych používateľov
UPDATE projects 
SET created_by = (
  SELECT user_id 
  FROM workspace_users 
  WHERE user_order = (1 + (projects.id::text::bit(32)::int % (SELECT COUNT(*) FROM workspace_users)))
)
WHERE workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 4. Rozdeľ úlohy medzi rôznych používateľov
WITH workspace_users AS (
  SELECT wm.user_id, p.display_name, p.email,
         ROW_NUMBER() OVER (ORDER BY wm.created_at) as user_order
  FROM workspace_members wm
  LEFT JOIN profiles p ON wm.user_id = p.id
  WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
)
UPDATE tasks 
SET created_by = (
  SELECT user_id 
  FROM workspace_users 
  WHERE user_order = (1 + (tasks.id::text::bit(32)::int % (SELECT COUNT(*) FROM workspace_users)))
)
WHERE workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 5. Rozdeľ komentáre medzi rôznych používateľov
WITH workspace_users AS (
  SELECT wm.user_id, p.display_name, p.email,
         ROW_NUMBER() OVER (ORDER BY wm.created_at) as user_order
  FROM workspace_members wm
  LEFT JOIN profiles p ON wm.user_id = p.id
  WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
)
UPDATE task_comments 
SET user_id = (
  SELECT user_id 
  FROM workspace_users 
  WHERE user_order = (1 + (task_comments.id::text::bit(32)::int % (SELECT COUNT(*) FROM workspace_users)))
)
WHERE workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 6. Rozdeľ time entries medzi rôznych používateľov
WITH workspace_users AS (
  SELECT wm.user_id, p.display_name, p.email,
         ROW_NUMBER() OVER (ORDER BY wm.created_at) as user_order
  FROM workspace_members wm
  LEFT JOIN profiles p ON wm.user_id = p.id
  WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
)
UPDATE time_entries 
SET user_id = (
  SELECT user_id 
  FROM workspace_users 
  WHERE user_order = (1 + (time_entries.id::text::bit(32)::int % (SELECT COUNT(*) FROM workspace_users)))
)
WHERE workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 7. Skontroluj výsledky
SELECT 'AFTER DISTRIBUTION - CLIENTS:' as info;
SELECT c.id, c.name, c.created_by, p.display_name, p.email
FROM clients c
LEFT JOIN profiles p ON c.created_by = p.id
WHERE c.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY c.created_at DESC;

SELECT 'AFTER DISTRIBUTION - PROJECTS:' as info;
SELECT p.id, p.name, p.created_by, pr.display_name, pr.email
FROM projects p
LEFT JOIN profiles pr ON p.created_by = pr.id
WHERE p.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY p.created_at DESC;

SELECT 'AFTER DISTRIBUTION - TASKS:' as info;
SELECT t.id, t.title, t.created_by, pr.display_name, pr.email
FROM tasks t
LEFT JOIN profiles pr ON t.created_by = pr.id
WHERE t.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY t.created_at DESC;
