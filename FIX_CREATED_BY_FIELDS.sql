-- FIX CREATED_BY FIELDS - Spustite toto v Supabase SQL Editor

-- 1. Najprv skontroluj, či sú v databáze profily
SELECT id, display_name, email FROM profiles LIMIT 5;

-- 2. Skontroluj projekty a ich created_by
SELECT id, name, created_by FROM projects LIMIT 5;

-- 3. Skontroluj úlohy a ich created_by  
SELECT id, title, created_by FROM tasks LIMIT 5;

-- 4. Skontroluj workspace members
SELECT id, user_id, invited_by FROM workspace_members LIMIT 5;

-- 5. Ak sú profily, vyplň created_by polia v projektoch
-- (Nahraď 'USER_ID_HERE' skutočným ID používateľa z profiles tabuľky)
UPDATE projects 
SET created_by = (SELECT id FROM profiles LIMIT 1)
WHERE created_by IS NULL;

-- 6. Vyplň created_by polia v úlohách
UPDATE tasks 
SET created_by = (SELECT id FROM profiles LIMIT 1)
WHERE created_by IS NULL;

-- 7. Vyplň invited_by polia v workspace_members
UPDATE workspace_members 
SET invited_by = (SELECT id FROM profiles LIMIT 1)
WHERE invited_by IS NULL;

-- 8. Skontroluj výsledky
SELECT 'Projects after update:' as info;
SELECT id, name, created_by FROM projects LIMIT 5;

SELECT 'Tasks after update:' as info;
SELECT id, title, created_by FROM tasks LIMIT 5;

SELECT 'Workspace members after update:' as info;
SELECT id, user_id, invited_by FROM workspace_members LIMIT 5;
