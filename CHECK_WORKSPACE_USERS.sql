-- CHECK WORKSPACE USERS - Spustite toto v Supabase SQL Editor

-- 1. Skontroluj všetkých používateľov v profiles
SELECT 'ALL PROFILES:' as info;
SELECT id, display_name, email, role FROM profiles;

-- 2. Skontroluj workspace members
SELECT 'WORKSPACE MEMBERS:' as info;
SELECT wm.id, wm.user_id, wm.role, p.display_name, p.email 
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 3. Skontroluj projekty a ich created_by
SELECT 'PROJECTS WITH CREATORS:' as info;
SELECT p.id, p.name, p.created_by, pr.display_name, pr.email
FROM projects p
LEFT JOIN profiles pr ON p.created_by = pr.id
WHERE p.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 4. Skontroluj úlohy a ich created_by
SELECT 'TASKS WITH CREATORS:' as info;
SELECT t.id, t.title, t.created_by, pr.display_name, pr.email
FROM tasks t
LEFT JOIN profiles pr ON t.created_by = pr.id
WHERE t.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 5. Skontroluj komentáre
SELECT 'COMMENTS WITH USERS:' as info;
SELECT tc.id, tc.content, tc.user_id, pr.display_name, pr.email
FROM task_comments tc
LEFT JOIN profiles pr ON tc.user_id = pr.id
WHERE tc.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 6. Skontroluj time entries
SELECT 'TIME ENTRIES WITH USERS:' as info;
SELECT te.id, te.hours, te.description, te.user_id, pr.display_name, pr.email
FROM time_entries te
LEFT JOIN profiles pr ON te.user_id = pr.id
WHERE te.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';
