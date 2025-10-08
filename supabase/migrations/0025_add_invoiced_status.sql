-- Add 'invoiced' status to task_status enum
ALTER TYPE task_status ADD VALUE 'invoiced';

-- Add invoiced_at column to tasks table
ALTER TABLE tasks ADD COLUMN invoiced_at TIMESTAMP WITH TIME ZONE;
