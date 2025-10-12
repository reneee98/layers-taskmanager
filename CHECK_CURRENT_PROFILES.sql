-- CHECK CURRENT PROFILES - Spustite toto v Supabase SQL Editor

-- 1. Skontroluj všetkých používateľov v profiles
SELECT 'CURRENT PROFILES:' as info;
SELECT id, display_name, email, role FROM profiles;

-- 2. Skontroluj workspace members
SELECT 'WORKSPACE MEMBERS:' as info;
SELECT wm.id, wm.user_id, wm.role, p.display_name, p.email 
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 3. Skontroluj posledného klienta a jeho tvorcu
SELECT 'LAST CLIENT WITH CREATOR:' as info;
SELECT c.id, c.name, c.created_by, p.display_name, p.email
FROM clients c
LEFT JOIN profiles p ON c.created_by = p.id
WHERE c.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY c.created_at DESC
LIMIT 1;
