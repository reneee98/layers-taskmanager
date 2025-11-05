-- Migration: Make project_id nullable in tasks table
-- Purpose: Allow tasks to exist without a project

-- Drop the NOT NULL constraint on project_id
ALTER TABLE tasks 
ALTER COLUMN project_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
-- First, drop the existing foreign key constraint if it exists
DO $$ 
BEGIN
  -- Find and drop the existing foreign key constraint
  ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
  
  -- Recreate the foreign key constraint that allows NULL
  ALTER TABLE tasks 
  ADD CONSTRAINT tasks_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;
END $$;

-- Add comment
COMMENT ON COLUMN tasks.project_id IS 'Reference to project. Can be NULL for tasks without a project.';

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name = 'project_id';

