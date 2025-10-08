-- Migration: Add order_index column to tasks table
-- This enables drag & drop sorting of tasks

-- Add order_index column
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for faster sorting queries
CREATE INDEX IF NOT EXISTS idx_tasks_order_index 
  ON tasks(project_id, order_index);

-- Update existing tasks to have sequential order_index
WITH numbered_tasks AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 AS new_order
  FROM tasks
)
UPDATE tasks
SET order_index = numbered_tasks.new_order
FROM numbered_tasks
WHERE tasks.id = numbered_tasks.id;

-- Add comment
COMMENT ON COLUMN tasks.order_index IS 'Order index for drag & drop sorting within a project';

-- Verify migration
SELECT 
  'Migration complete!' as status,
  COUNT(*) as total_tasks,
  COUNT(DISTINCT project_id) as projects_with_tasks
FROM tasks;

