-- Add start_date column to tasks table
-- This migration adds a start_date field to track when a task should be started

-- Add start_date column to tasks table
ALTER TABLE tasks 
ADD COLUMN start_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN tasks.start_date IS 'Date when the task should be started';

-- Create index for better performance on start_date queries
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);

-- Update existing tasks to have start_date set to created_at if not set
UPDATE tasks 
SET start_date = created_at::date 
WHERE start_date IS NULL;
