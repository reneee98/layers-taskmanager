-- FIX EXISTING WORKSPACES - Spustite toto v Supabase SQL Editor

-- 1. Skontroluj všetky workspaces a ich ownery
SELECT 'ALL WORKSPACES:' as info;
SELECT w.id, w.name, w.owner_id, p.display_name, p.email 
FROM workspaces w
LEFT JOIN profiles p ON w.owner_id = p.id;

-- 2. Skontroluj workspace members
SELECT 'CURRENT WORKSPACE MEMBERS:' as info;
SELECT wm.workspace_id, wm.user_id, wm.role, p.display_name, p.email 
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
ORDER BY wm.workspace_id;

-- 3. Pridaj ownera do workspace_members pre všetky workspaces kde chýba
INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
SELECT 
  w.id as workspace_id,
  w.owner_id as user_id,
  'owner' as role,
  w.created_at
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm 
  WHERE wm.workspace_id = w.id 
  AND wm.user_id = w.owner_id
);

-- 4. Skontroluj výsledok
SELECT 'AFTER FIX - WORKSPACE MEMBERS:' as info;
SELECT wm.workspace_id, wm.user_id, wm.role, p.display_name, p.email 
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
ORDER BY wm.workspace_id, wm.created_at;
