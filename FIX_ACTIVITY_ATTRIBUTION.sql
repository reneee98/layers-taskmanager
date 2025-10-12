-- FIX ACTIVITY ATTRIBUTION - Spustite toto v Supabase SQL Editor

-- 1. Najprv skontroluj aktuálne dáta
SELECT 'BEFORE FIX - PROFILES:' as info;
SELECT id, display_name, email FROM profiles;

SELECT 'BEFORE FIX - PROJECTS:' as info;
SELECT id, name, created_by FROM projects;

SELECT 'BEFORE FIX - TASKS:' as info;
SELECT id, title, created_by FROM tasks;

-- 2. Ak existuje len jeden používateľ, vytvor ďalších
INSERT INTO profiles (id, display_name, email, role) VALUES
  (gen_random_uuid(), 'René Moravec', 'rene@example.com', 'owner'),
  (gen_random_uuid(), 'Jana Nováková', 'jana@example.com', 'member'),
  (gen_random_uuid(), 'Peter Kováč', 'peter@example.com', 'member'),
  (gen_random_uuid(), 'Anna Svobodová', 'anna@example.com', 'member')
ON CONFLICT (email) DO NOTHING;

-- 3. Rozdeľ projekty medzi rôznych používateľov
UPDATE projects 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'René Moravec' LIMIT 1)
WHERE id = (SELECT id FROM projects LIMIT 1);

UPDATE projects 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'Jana Nováková' LIMIT 1)
WHERE id = (SELECT id FROM projects OFFSET 1 LIMIT 1);

UPDATE projects 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'Peter Kováč' LIMIT 1)
WHERE id = (SELECT id FROM projects OFFSET 2 LIMIT 1);

-- 4. Rozdeľ úlohy medzi rôznych používateľov
UPDATE tasks 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'Anna Svobodová' LIMIT 1)
WHERE id = (SELECT id FROM tasks LIMIT 1);

UPDATE tasks 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'René Moravec' LIMIT 1)
WHERE id = (SELECT id FROM tasks OFFSET 1 LIMIT 1);

UPDATE tasks 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'Jana Nováková' LIMIT 1)
WHERE id = (SELECT id FROM tasks OFFSET 2 LIMIT 1);

UPDATE tasks 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'Peter Kováč' LIMIT 1)
WHERE id = (SELECT id FROM tasks OFFSET 3 LIMIT 1);

-- 5. Rozdeľ komentáre medzi rôznych používateľov
UPDATE task_comments 
SET user_id = (SELECT id FROM profiles WHERE display_name = 'Peter Kováč' LIMIT 1)
WHERE id = (SELECT id FROM task_comments LIMIT 1);

UPDATE task_comments 
SET user_id = (SELECT id FROM profiles WHERE display_name = 'René Moravec' LIMIT 1)
WHERE id = (SELECT id FROM task_comments OFFSET 1 LIMIT 1);

UPDATE task_comments 
SET user_id = (SELECT id FROM profiles WHERE display_name = 'Jana Nováková' LIMIT 1)
WHERE id = (SELECT id FROM task_comments OFFSET 2 LIMIT 1);

-- 6. Rozdeľ time entries medzi rôznych používateľov
UPDATE time_entries 
SET user_id = (SELECT id FROM profiles WHERE display_name = 'Anna Svobodová' LIMIT 1)
WHERE id = (SELECT id FROM time_entries LIMIT 1);

UPDATE time_entries 
SET user_id = (SELECT id FROM profiles WHERE display_name = 'René Moravec' LIMIT 1)
WHERE id = (SELECT id FROM time_entries OFFSET 1 LIMIT 1);

UPDATE time_entries 
SET user_id = (SELECT id FROM profiles WHERE display_name = 'Peter Kováč' LIMIT 1)
WHERE id = (SELECT id FROM time_entries OFFSET 2 LIMIT 1);

-- 7. Skontroluj výsledky
SELECT 'AFTER FIX - PROFILES:' as info;
SELECT id, display_name, email FROM profiles;

SELECT 'AFTER FIX - PROJECTS:' as info;
SELECT id, name, created_by FROM projects;

SELECT 'AFTER FIX - TASKS:' as info;
SELECT id, title, created_by FROM tasks;

SELECT 'AFTER FIX - COMMENTS:' as info;
SELECT id, content, user_id FROM task_comments;

SELECT 'AFTER FIX - TIME ENTRIES:' as info;
SELECT id, hours, description, user_id FROM time_entries;
