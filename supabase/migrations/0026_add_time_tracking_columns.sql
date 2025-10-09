-- Update existing start_time and end_time columns to TIME format
ALTER TABLE time_entries 
ALTER COLUMN start_time TYPE TIME USING start_time::TIME,
ALTER COLUMN end_time TYPE TIME USING end_time::TIME;

-- Add comment to explain the columns
COMMENT ON COLUMN time_entries.start_time IS 'Time when work started (HH:mm:ss format)';
COMMENT ON COLUMN time_entries.end_time IS 'Time when work ended (HH:mm:ss format)';
