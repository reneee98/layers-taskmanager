-- ADD OWNER TO WORKSPACE MEMBERS - Spustite toto v Supabase SQL Editor

-- 1. Skontroluj workspace a jeho ownera
SELECT 'WORKSPACE INFO:' as info;
SELECT id, name, owner_id FROM workspaces WHERE id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 2. Skontroluj owner profil
SELECT 'OWNER PROFILE:' as info;
SELECT p.id, p.display_name, p.email 
FROM workspaces w
LEFT JOIN profiles p ON w.owner_id = p.id
WHERE w.id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 3. Skontroluj aktuálnych členov workspace
SELECT 'CURRENT MEMBERS:' as info;
SELECT wm.id, wm.user_id, wm.role, p.display_name, p.email 
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe';

-- 4. Pridaj ownera do workspace_members ak tam nie je
INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
SELECT 
  w.id as workspace_id,
  w.owner_id as user_id,
  'owner' as role,
  w.created_at
FROM workspaces w
WHERE w.id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
AND NOT EXISTS (
  SELECT 1 FROM workspace_members wm 
  WHERE wm.workspace_id = w.id 
  AND wm.user_id = w.owner_id
);

-- 5. Skontroluj výsledok
SELECT 'AFTER ADDING OWNER - MEMBERS:' as info;
SELECT wm.id, wm.user_id, wm.role, p.display_name, p.email 
FROM workspace_members wm
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '0727a4a2-b57f-437d-bf83-c4b6b5b633fe'
ORDER BY wm.created_at;
