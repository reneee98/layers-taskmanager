-- CHECK CURRENT DATA - Spustite toto v Supabase SQL Editor

-- 1. Skontroluj profily
SELECT 'PROFILES:' as info;
SELECT id, display_name, email FROM profiles;

-- 2. Skontroluj projekty a ich created_by
SELECT 'PROJECTS:' as info;
SELECT id, name, created_by FROM projects;

-- 3. Skontroluj úlohy a ich created_by
SELECT 'TASKS:' as info;
SELECT id, title, created_by FROM tasks;

-- 4. Skontroluj komentáre
SELECT 'COMMENTS:' as info;
SELECT id, content, user_id FROM task_comments;

-- 5. Skontroluj time entries
SELECT 'TIME ENTRIES:' as info;
SELECT id, hours, description, user_id FROM time_entries;

-- 6. Skontroluj workspace members
SELECT 'WORKSPACE MEMBERS:' as info;
SELECT id, user_id, invited_by FROM workspace_members;
