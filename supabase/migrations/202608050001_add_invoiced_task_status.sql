-- Add the invoiced state used by invoice APIs to the task status enum.
-- Kept separate from the trigger migration because PostgreSQL requires a new
-- enum value to be committed before it is referenced by later SQL.
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'invoiced' AFTER 'done';

COMMENT ON TYPE task_status IS
  'Task status enum: todo, in_progress, review, sent_to_client, done, invoiced, cancelled';
