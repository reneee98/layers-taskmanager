-- CREATE MULTIPLE USERS - Spustite toto v Supabase SQL Editor

-- 1. Skontroluj aktuálne profily
SELECT id, display_name, email FROM profiles;

-- 2. Vytvor ďalších používateľov ak ich nie je dosť
INSERT INTO profiles (id, display_name, email, role) VALUES
  (gen_random_uuid(), 'René Moravec', 'rene@example.com', 'owner'),
  (gen_random_uuid(), 'Jana Nováková', 'jana@example.com', 'member'),
  (gen_random_uuid(), 'Peter Kováč', 'peter@example.com', 'member'),
  (gen_random_uuid(), 'Anna Svobodová', 'anna@example.com', 'member')
ON CONFLICT (email) DO NOTHING;

-- 3. Skontroluj profily po vložení
SELECT id, display_name, email FROM profiles;

-- 4. Rozdeľ created_by polia medzi rôznych používateľov
-- Projekty - priraď rôznych používateľov
UPDATE projects 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'René Moravec' LIMIT 1)
WHERE id = (SELECT id FROM projects LIMIT 1);

UPDATE projects 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'Jana Nováková' LIMIT 1)
WHERE id = (SELECT id FROM projects OFFSET 1 LIMIT 1);

-- Úlohy - priraď rôznych používateľov
UPDATE tasks 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'Peter Kováč' LIMIT 1)
WHERE id = (SELECT id FROM tasks LIMIT 1);

UPDATE tasks 
SET created_by = (SELECT id FROM profiles WHERE display_name = 'Anna Svobodová' LIMIT 1)
WHERE id = (SELECT id FROM tasks OFFSET 1 LIMIT 1);

-- 5. Skontroluj výsledky
SELECT 'Projects after update:' as info;
SELECT id, name, created_by FROM projects;

SELECT 'Tasks after update:' as info;
SELECT id, title, created_by FROM tasks;
