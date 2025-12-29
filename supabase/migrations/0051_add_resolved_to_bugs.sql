-- Migration: Add is_resolved column to bugs table
-- Purpose: Allow marking bugs as resolved/unresolved

-- Add is_resolved column
ALTER TABLE bugs
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_bugs_is_resolved ON bugs(is_resolved);

-- Add comment
COMMENT ON COLUMN bugs.is_resolved IS 'Označuje, či bol bug vyriešený';

