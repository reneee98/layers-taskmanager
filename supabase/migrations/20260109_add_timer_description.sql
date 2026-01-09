-- Add description column to task_timers table
ALTER TABLE task_timers 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Add comment
COMMENT ON COLUMN task_timers.description IS 'Optional description of what user is working on during this timer session';

