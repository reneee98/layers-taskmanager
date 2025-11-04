-- Migration: Create bugs table for bug reporting
-- Purpose: Allow users to report bugs with RLS policies

-- Create helper function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  -- René Moravec email (update if needed)
  RETURN user_email = 'design@renemoravec.sk' OR user_email = 'rene@renemoravec.sk';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_superadmin(UUID) TO authenticated;

-- Create bugs table
CREATE TABLE IF NOT EXISTS bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT bugs_description_not_empty CHECK (LENGTH(TRIM(description)) > 0),
  CONSTRAINT bugs_url_not_empty CHECK (LENGTH(TRIM(url)) > 0)
);

-- Add comments
COMMENT ON TABLE bugs IS 'Tabuľka pre reportovanie bugov';
COMMENT ON COLUMN bugs.id IS 'Unikátne ID bug reportu';
COMMENT ON COLUMN bugs.user_id IS 'ID používateľa, ktorý nahlásil bug';
COMMENT ON COLUMN bugs.description IS 'Popis bugu';
COMMENT ON COLUMN bugs.url IS 'URL stránky, kde bol bug nahlásený';
COMMENT ON COLUMN bugs.created_at IS 'Dátum a čas nahlásenia bugu';

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_bugs_user_id ON bugs(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_bugs_created_at ON bugs(created_at DESC);

-- Enable RLS
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can insert bugs
-- Users can only insert bugs where user_id matches their auth.uid()
CREATE POLICY "Users can insert bugs"
ON bugs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id
);

-- Policy: Only superadmin can select bugs
-- Superadmin is identified by JWT claim app_role = 'superadmin' or by email
CREATE POLICY "Superadmin can select bugs"
ON bugs
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'app_role')::text = 'superadmin' OR
  is_superadmin(auth.uid())
);

-- Grant permissions
GRANT INSERT ON bugs TO authenticated;
GRANT SELECT ON bugs TO authenticated;

