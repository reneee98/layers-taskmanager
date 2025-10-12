-- CHECK WORKSPACE MEMBERS - Spustite toto v Supabase SQL Editor

-- 1. Skontroluj workspace members
SELECT 'WORKSPACE MEMBERS:' as info;
SELECT wm.id, wm.user_id, wm.role, p.display_name, p.email 
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 2. Skontroluj všetky aktivity a ich tvorcov
SELECT 'ALL CLIENTS:' as info;
SELECT c.id, c.name, c.created_by, p.display_name, p.email
FROM clients c
LEFT JOIN profiles p ON c.created_by = p.id
WHERE c.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY c.created_at DESC;

SELECT 'ALL PROJECTS:' as info;
SELECT p.id, p.name, p.created_by, pr.display_name, pr.email
FROM projects p
LEFT JOIN profiles pr ON p.created_by = pr.id
WHERE p.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY p.created_at DESC;

SELECT 'ALL TASKS:' as info;
SELECT t.id, t.title, t.created_by, pr.display_name, pr.email
FROM tasks t
LEFT JOIN profiles pr ON t.created_by = pr.id
WHERE t.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY t.created_at DESC;
