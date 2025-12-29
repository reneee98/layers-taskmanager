-- Migration: Add default_hourly_rate to user_settings
-- Purpose: Allow users to set a default hourly rate for tasks without projects

-- Add default_hourly_rate column to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS default_hourly_rate DECIMAL(10, 2);

-- Add comment
COMMENT ON COLUMN user_settings.default_hourly_rate IS 'Default hourly rate for tasks without projects (in euros)';


