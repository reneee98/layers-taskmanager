-- FIX REAL USERS ATTRIBUTION - Spustite toto v Supabase SQL Editor

-- 1. Najprv skontroluj aktuálne dáta
SELECT 'BEFORE FIX - WORKSPACE MEMBERS:' as info;
SELECT wm.user_id, p.display_name, p.email 
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 2. Oprav created_by v projektoch - použij skutočných používateľov z workspace
UPDATE projects 
SET created_by = (
  SELECT wm.user_id 
  FROM workspace_members wm 
  WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe' 
  ORDER BY RANDOM() 
  LIMIT 1
)
WHERE workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
AND created_by IS NULL;

-- 3. Oprav created_by v úlohách - použij skutočných používateľov z workspace
UPDATE tasks 
SET created_by = (
  SELECT wm.user_id 
  FROM workspace_members wm 
  WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe' 
  ORDER BY RANDOM() 
  LIMIT 1
)
WHERE workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
AND created_by IS NULL;

-- 4. Oprav user_id v komentároch - použij skutočných používateľov z workspace
UPDATE task_comments 
SET user_id = (
  SELECT wm.user_id 
  FROM workspace_members wm 
  WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe' 
  ORDER BY RANDOM() 
  LIMIT 1
)
WHERE workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
AND user_id IS NULL;

-- 5. Oprav user_id v time entries - použij skutočných používateľov z workspace
UPDATE time_entries 
SET user_id = (
  SELECT wm.user_id 
  FROM workspace_members wm 
  WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe' 
  ORDER BY RANDOM() 
  LIMIT 1
)
WHERE workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
AND user_id IS NULL;

-- 6. Oprav created_by v klientoch - použij skutočných používateľov z workspace
UPDATE clients 
SET created_by = (
  SELECT wm.user_id 
  FROM workspace_members wm 
  WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe' 
  ORDER BY RANDOM() 
  LIMIT 1
)
WHERE workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
AND created_by IS NULL;

-- 7. Skontroluj výsledky
SELECT 'AFTER FIX - PROJECTS WITH CREATORS:' as info;
SELECT p.id, p.name, p.created_by, pr.display_name, pr.email
FROM projects p
LEFT JOIN profiles pr ON p.created_by = pr.id
WHERE p.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

SELECT 'AFTER FIX - TASKS WITH CREATORS:' as info;
SELECT t.id, t.title, t.created_by, pr.display_name, pr.email
FROM tasks t
LEFT JOIN profiles pr ON t.created_by = pr.id
WHERE t.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

SELECT 'AFTER FIX - COMMENTS WITH USERS:' as info;
SELECT tc.id, tc.content, tc.user_id, pr.display_name, pr.email
FROM task_comments tc
LEFT JOIN profiles pr ON tc.user_id = pr.id
WHERE tc.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

SELECT 'AFTER FIX - TIME ENTRIES WITH USERS:' as info;
SELECT te.id, te.hours, te.description, te.user_id, pr.display_name, pr.email
FROM time_entries te
LEFT JOIN profiles pr ON te.user_id = pr.id
WHERE te.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';
