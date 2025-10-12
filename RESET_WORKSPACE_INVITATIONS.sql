-- RESET WORKSPACE INVITATIONS - Spustite toto v Supabase SQL Editor

-- 1. Vymazať všetky existujúce pozvánky
DELETE FROM public.workspace_invitations;

-- 2. Vymazať všetky členstvo v workspace (okrem owner-ov)
DELETE FROM public.workspace_members 
WHERE role != 'owner';

-- 3. Skontrolovať výsledok
SELECT 'Workspace invitations cleared' as status;
SELECT 'Workspace members cleared (except owners)' as status;
