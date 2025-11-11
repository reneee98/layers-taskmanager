-- Migration: Make project_id nullable in time_entries table
-- Purpose: Allow time entries to exist without a project (for tasks without projects)
-- This fixes the issue where users cannot save time to tasks without a project

-- Drop the NOT NULL constraint on project_id
ALTER TABLE time_entries 
ALTER COLUMN project_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
-- First, drop the existing foreign key constraint if it exists
DO $$ 
BEGIN
  -- Find and drop the existing foreign key constraint
  ALTER TABLE time_entries 
  DROP CONSTRAINT IF EXISTS time_entries_project_id_fkey;
  
  -- Recreate the foreign key constraint that allows NULL
  ALTER TABLE time_entries 
  ADD CONSTRAINT time_entries_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;
END $$;

-- Add comment
COMMENT ON COLUMN time_entries.project_id IS 'Reference to project. Can be NULL for time entries on tasks without a project.';

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
  AND column_name = 'project_id';


