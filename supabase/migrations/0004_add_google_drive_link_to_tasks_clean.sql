-- Add google_drive_link column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS google_drive_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tasks.google_drive_link IS 'Google Drive link for task files and documents';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name = 'google_drive_link';
