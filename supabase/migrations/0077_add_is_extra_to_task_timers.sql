-- Migration: Add is_extra field to task_timers table
-- Purpose: Track whether a timer is tracking extra (non-billable) time

-- Add is_extra column to task_timers table
ALTER TABLE task_timers 
ADD COLUMN IF NOT EXISTS is_extra BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries on is_extra
CREATE INDEX IF NOT EXISTS idx_task_timers_is_extra ON task_timers(is_extra);

-- Add comment
COMMENT ON COLUMN task_timers.is_extra IS 'Indicates whether this timer is tracking extra (non-billable) time';

