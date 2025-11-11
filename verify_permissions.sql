-- VERIFIKAČNÝ SKRIPT PRE KONTROLU OPRÁVNENÍ
-- Spustiť v Supabase SQL Editor

-- ================================================================
-- 1. KONTROLA RLS NA VŠETKÝCH PUBLIC TABUĽKÁCH
-- ================================================================
SELECT 
  tablename as "Tabuľka",
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ DISABLED'
  END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
ORDER BY 
  CASE WHEN rowsecurity THEN 0 ELSE 1 END, 
  tablename;

-- ================================================================
-- 2. VŠETKY AKTÍVNE RLS POLITIKY
-- ================================================================
SELECT 
  tablename as "Tabuľka",
  policyname as "Politika",
  cmd as "Operácia",
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅'
    ELSE '⛔'
  END as "Typ"
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================================
-- 3. TABUĽKY BEZ RLS POLITÍK (POTENCIÁLNY PROBLÉM)
-- ================================================================
SELECT 
  t.tablename as "⚠️ Tabuľka bez politiky",
  CASE 
    WHEN t.rowsecurity THEN 'RLS Enabled ale bez policy'
    ELSE 'RLS DISABLED'
  END as "Status"
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
  AND p.policyname IS NULL
  AND t.rowsecurity = true  -- Len tabuľky kde je RLS enabled ale chýba policy
ORDER BY t.tablename;

-- ================================================================  
-- 4. HELPER FUNKCIE PRE OPRÁVNENIA
-- ================================================================
SELECT 
  routine_name as "Funkcia",
  routine_type as "Typ",
  security_type as "Security",
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ SECURITY DEFINER'
    ELSE '⚠️ INVOKER'
  END as "Status"
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_workspace_owner',
    'is_workspace_member', 
    'get_task_workspace',
    'is_project_owner_or_manager',
    'is_project_member'
  )
ORDER BY routine_name;

-- ================================================================
-- 5. TEST WORKSPACE MEMBERSHIP PRE AKTUÁLNEHO POUŽÍVATEĽA
-- ================================================================
-- Tento test ukáže všetky workspaces kde má aktuálny user prístup
SELECT 
  w.id,
  w.name as "Workspace",
  CASE 
    WHEN w.owner_id = auth.uid() THEN '👑 Owner'
    WHEN wm.role = 'admin' THEN '⭐ Admin'
    WHEN wm.role IS NOT NULL THEN '👤 Member (' || wm.role || ')'
    ELSE '❌ No Access'
  END as "Rola",
  wm.created_at as "Člen od"
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = auth.uid()
WHERE w.owner_id = auth.uid() OR wm.user_id IS NOT NULL
ORDER BY w.name;

-- ================================================================
-- 6. TEST PRÍSTUPU K TASKAM PRE AKTUÁLNEHO POUŽÍVATEĽA
-- ================================================================
-- Tento test ukáže počet taskov ktoré môže user vidieť
SELECT 
  w.name as "Workspace",
  COUNT(t.id) as "Počet taskov",
  COUNT(CASE WHEN t.status != 'done' AND t.status != 'cancelled' THEN 1 END) as "Aktívne tasky"
FROM workspaces w
LEFT JOIN tasks t ON t.workspace_id = w.id
WHERE (
  w.owner_id = auth.uid() 
  OR w.id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
)
GROUP BY w.id, w.name
ORDER BY w.name;

-- ================================================================
-- 7. TEST PRÍSTUPU K TIME ENTRIES
-- ================================================================
SELECT 
  w.name as "Workspace",
  COUNT(te.id) as "Počet time entries",
  SUM(te.hours) as "Celkom hodín",
  COUNT(DISTINCT te.user_id) as "Počet používateľov"
FROM workspaces w
LEFT JOIN time_entries te ON te.workspace_id = w.id
WHERE (
  w.owner_id = auth.uid() 
  OR w.id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
)
GROUP BY w.id, w.name
ORDER BY w.name;

-- ================================================================
-- 8. KONTROLA DUPLICITNÝCH POLITÍK
-- ================================================================
-- Nájde tabuľky s viacerými podobnými politikami
SELECT 
  tablename as "Tabuľka",
  COUNT(*) as "Počet politík",
  STRING_AGG(policyname, ', ') as "Názvy politík"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 2
ORDER BY COUNT(*) DESC;

-- ================================================================
-- 9. OVERENIE ŽE AUTH.UID() FUNGUJE
-- ================================================================
SELECT 
  auth.uid() as "Current User ID",
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ Authenticated'
    ELSE '❌ Not Authenticated'
  END as "Auth Status",
  (SELECT email FROM auth.users WHERE id = auth.uid()) as "Email";

-- ================================================================
-- 10. KRITICKÉ - WORKSPACES BEZ ČLENOV
-- ================================================================
-- Nájde workspaces kde owner nie je v workspace_members
SELECT 
  w.id,
  w.name as "Workspace",
  w.owner_id,
  (SELECT email FROM auth.users WHERE id = w.owner_id) as "Owner Email",
  CASE 
    WHEN wm.user_id IS NULL THEN '⚠️ Owner nie je member'
    ELSE '✅ OK'
  END as "Status"
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND w.owner_id = wm.user_id
WHERE wm.user_id IS NULL
ORDER BY w.name;

-- ================================================================
-- KONIEC VERIFIKÁCIE
-- ================================================================
-- Všetky testy by mali vrátiť výsledky bez ❌ alebo ⚠️
-- Ak vidíš problémy, kontaktuj admin tím

