-- FIX DISPLAY NAMES FINAL - Spustite toto v Supabase SQL Editor

-- 1. Skontroluj aktuálne profily
SELECT 'BEFORE FIX - PROFILES:' as info;
SELECT id, display_name, email FROM profiles;

-- 2. Oprav display_name pre všetkých používateľov
UPDATE profiles 
SET display_name = CASE 
  WHEN email = 'renkomoravec@gmail.com' THEN 'René Moravec'
  WHEN email = 'valentinabusova148@gmail.com' THEN 'Valentina Bušová'
  WHEN email LIKE '%rene%' THEN 'René Moravec'
  WHEN email LIKE '%valentina%' THEN 'Valentina Bušová'
  WHEN display_name IS NULL OR display_name = '' OR display_name = 'valentinabusova148' THEN SPLIT_PART(email, '@', 1)
  ELSE display_name
END;

-- 3. Skontroluj výsledky
SELECT 'AFTER FIX - PROFILES:' as info;
SELECT id, display_name, email FROM profiles;

-- 4. Skontroluj klientov a ich created_by
SELECT 'CLIENTS WITH CREATORS:' as info;
SELECT c.id, c.name, c.created_by, p.display_name, p.email
FROM clients c
LEFT JOIN profiles p ON c.created_by = p.id
WHERE c.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY c.created_at DESC;

-- 5. Skontroluj projekty a ich created_by
SELECT 'PROJECTS WITH CREATORS:' as info;
SELECT p.id, p.name, p.created_by, pr.display_name, pr.email
FROM projects p
LEFT JOIN profiles pr ON p.created_by = pr.id
WHERE p.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY p.created_at DESC;

-- 6. Skontroluj úlohy a ich created_by
SELECT 'TASKS WITH CREATORS:' as info;
SELECT t.id, t.title, t.created_by, pr.display_name, pr.email
FROM tasks t
LEFT JOIN profiles pr ON t.created_by = pr.id
WHERE t.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY t.created_at DESC;
