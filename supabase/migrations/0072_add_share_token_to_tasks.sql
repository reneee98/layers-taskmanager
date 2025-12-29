-- Migration: Add share_token to tasks table
-- Purpose: Allow tasks to be shared via public links

-- Add share_token column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_share_token ON tasks(share_token) WHERE share_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN tasks.share_token IS 'Unique token for sharing task via public link. NULL means task is not shared.';

-- Function to generate a unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random token (32 characters, alphanumeric + base64url safe chars)
    token := encode(gen_random_bytes(24), 'base64');
    -- Replace URL-unsafe characters
    token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
    token := substring(token from 1 for 32);
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM tasks WHERE share_token = token) INTO exists_check;
    
    -- Exit loop if token is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name = 'share_token';

