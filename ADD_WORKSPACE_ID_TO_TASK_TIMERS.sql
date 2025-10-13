-- ADD WORKSPACE_ID TO TASK_TIMERS - Spustite toto v Supabase SQL Editor

-- 1. Pridaj workspace_id stĺpec do task_timers tabuľky
ALTER TABLE task_timers ADD COLUMN workspace_id UUID REFERENCES workspaces(id);

-- 2. Vyplň workspace_id pre existujúce timery (ak existujú)
UPDATE task_timers 
SET workspace_id = (
  SELECT t.workspace_id 
  FROM tasks t 
  WHERE t.id = task_timers.task_id
)
WHERE workspace_id IS NULL;

-- 3. Pridaj NOT NULL constraint po vyplnení dát
ALTER TABLE task_timers ALTER COLUMN workspace_id SET NOT NULL;

-- 4. Pridaj index pre lepšiu performance
CREATE INDEX IF NOT EXISTS idx_task_timers_workspace_id ON task_timers(workspace_id);

-- 5. Aktualizuj start_timer funkciu aby používala workspace_id
CREATE OR REPLACE FUNCTION start_timer(p_task_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    timer_id UUID;
    task_workspace_id UUID;
BEGIN
    -- Získaj workspace_id z task
    SELECT workspace_id INTO task_workspace_id
    FROM tasks 
    WHERE id = p_task_id;
    
    IF task_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Task not found or no workspace assigned';
    END IF;
    
    -- Stop any active timer for this user first
    UPDATE task_timers 
    SET stopped_at = NOW() 
    WHERE user_id = p_user_id AND stopped_at IS NULL;
    
    -- Start new timer
    INSERT INTO task_timers (task_id, user_id, workspace_id, started_at)
    VALUES (p_task_id, p_user_id, task_workspace_id, NOW())
    RETURNING id INTO timer_id;
    
    RETURN timer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Skontroluj výsledok
SELECT 'TASK_TIMERS AFTER UPDATE:' as info;
SELECT id, task_id, user_id, workspace_id, started_at, stopped_at 
FROM task_timers 
ORDER BY created_at DESC 
LIMIT 5;
