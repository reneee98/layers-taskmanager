-- Fix client_id column to allow NULL values for personal projects
-- This allows creating projects without a client

-- Drop the NOT NULL constraint on client_id column
ALTER TABLE projects ALTER COLUMN client_id DROP NOT NULL;

-- Add a comment to explain the change
COMMENT ON COLUMN projects.client_id IS 'Client ID - can be NULL for personal projects without client';

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'client_id';
