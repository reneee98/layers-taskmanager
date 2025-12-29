-- Test: Overenie, či sa nový používateľ automaticky nepridá do Layers workspace pri registrácii
-- Tento script má byť spustený v Supabase SQL Editor

-- 1. Skontroluj počet členov v Layers workspace pred testom
SELECT 
    'Počet členov v Layers workspace pred testom:' as info,
    COUNT(*) as count
FROM workspace_members 
WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- 2. Zobraz všetkých členov Layers workspace pred testom
SELECT 
    'Členovia Layers workspace pred testom:' as info,
    wm.user_id,
    p.email,
    p.display_name,
    wm.role
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
ORDER BY wm.created_at DESC;

-- 3. Skús vytvoriť nového používateľa (ak RLS nie je zapnutý, môže sa pridať)
-- TOTO BY SA NEMALO PODARIŤ, ak je RLS zapnutý a používateľ nie je owner
-- POZOR: Toto je len test - v reálnom scenári by používateľ mal registráciu cez UI

-- Simulácia: Pokus pridať nového používateľa do Layers workspace (bez toho, aby bol owner)
-- Tento INSERT by mal zlyhať, ak je RLS zapnutý správne
-- 
-- NAHRAD {TEST_USER_ID} skutočným ID používateľa, ktorého chceš testovať
-- Alebo vytvor test používateľa:
--
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   gen_random_uuid(),
--   'test@example.com',
--   crypt('testpassword', gen_salt('bf')),
--   now(),
--   now(),
--   now()
-- ) RETURNING id;
--
-- Potom skús pridať do workspace_members:
-- INSERT INTO workspace_members (workspace_id, user_id, role)
-- VALUES (
--   '6dd7d31a-3d36-4d92-a8eb-7146703a00b0',
--   {TEST_USER_ID}, -- ID z predchádzajúceho INSERT
--   'member'
-- );
-- 
-- Ak RLS funguje správne, tento INSERT by mal zlyhať s chybou 42501 (insufficient_privilege)

-- 4. Skontroluj RLS status pre workspace_members
SELECT 
    'RLS status pre workspace_members:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'workspace_members'
  AND schemaname = 'public';

-- 5. Zobraz existujúce RLS policies pre workspace_members
SELECT 
    'RLS policies pre workspace_members:' as info,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies 
WHERE tablename = 'workspace_members'
  AND schemaname = 'public';

-- 6. Záver:
-- - Ak RLS je zapnutý (rowsecurity = true) a existujú správne policies,
--   noví používatelia sa NEMÔŽU pridať do workspace cez INSERT
-- - Registrácia cez RegisterForm.tsx NEVYTVÁRA workspace_members záznamy
--   (používa len supabase.auth.signUp())
-- - Používateľ získava workspace až keď si prvýkrát navštívi /api/workspaces endpoint,
--   ktorý vytvorí NOVÝ workspace pre neho (nie Layers workspace)

