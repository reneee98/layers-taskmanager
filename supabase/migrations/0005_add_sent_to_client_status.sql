-- Migration: Add 'sent_to_client' status to task_status enum
-- Purpose: Allow tasks to be marked as sent to client

-- Add 'sent_to_client' to the existing task_status enum
ALTER TYPE task_status ADD VALUE 'sent_to_client';

-- Add comment for documentation
COMMENT ON TYPE task_status IS 'Task status enum: todo, in_progress, review, sent_to_client, done, cancelled';

-- Verify the enum was updated
SELECT unnest(enum_range(NULL::task_status)) as task_status_values;
