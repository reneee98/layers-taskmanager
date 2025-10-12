-- ADD CREATED_BY TO CLIENTS - Spustite toto v Supabase SQL Editor

-- 1. Pridaj stĺpec created_by do clients tabuľky
ALTER TABLE clients ADD COLUMN created_by UUID REFERENCES profiles(id);

-- 2. Pridaj stĺpec workspace_id ak neexistuje
ALTER TABLE clients ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);

-- 3. Vyplň created_by pre existujúcich klientov (ak existujú)
UPDATE clients 
SET created_by = (SELECT id FROM profiles LIMIT 1)
WHERE created_by IS NULL;

-- 4. Skontroluj výsledok
SELECT id, name, created_by, workspace_id FROM clients LIMIT 5;
