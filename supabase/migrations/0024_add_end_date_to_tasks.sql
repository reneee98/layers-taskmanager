-- Add end_date column to tasks table
-- This migration adds an end_date field to track when a task should be completed

-- Add end_date column to tasks table
ALTER TABLE tasks 
ADD COLUMN end_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN tasks.end_date IS 'Date when the task should be completed';

-- Create index for better performance on end_date queries
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);

-- Update existing tasks to have end_date set to due_date if not set
UPDATE tasks 
SET end_date = due_date 
WHERE end_date IS NULL AND due_date IS NOT NULL;
