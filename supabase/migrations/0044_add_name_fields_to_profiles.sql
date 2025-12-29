-- Migration: Add first_name and last_name to profiles
-- Purpose: Separate first name and last name instead of only display_name

-- Add name fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Add comments
COMMENT ON COLUMN profiles.first_name IS 'Meno používateľa';
COMMENT ON COLUMN profiles.last_name IS 'Priezvisko používateľa';

-- Update existing display_name to first_name if not already set
UPDATE profiles
SET first_name = SPLIT_PART(display_name, ' ', 1),
    last_name = CASE 
      WHEN display_name LIKE '% %' THEN SPLIT_PART(display_name, ' ', 2)
      ELSE NULL
    END
WHERE first_name IS NULL AND display_name IS NOT NULL;

