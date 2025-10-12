-- CHECK PROFILES - Spustite toto v Supabase SQL Editor

-- 1. Skontroluj profily
SELECT id, display_name, email FROM profiles LIMIT 5;

-- 2. Skontroluj projekty a ich created_by
SELECT id, name, created_by FROM projects LIMIT 5;

-- 3. Skontroluj úlohy a ich created_by
SELECT id, title, created_by FROM tasks LIMIT 5;

-- 4. Skontroluj workspace members
SELECT id, user_id, invited_by FROM workspace_members LIMIT 5;
