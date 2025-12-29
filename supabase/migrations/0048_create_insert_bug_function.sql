-- Migration: Create function to insert bugs with proper auth context
-- Purpose: Ensure bugs can be inserted correctly with RLS

-- Create function to insert bug report
-- This function runs with SECURITY DEFINER, so it bypasses RLS but still checks auth.uid()
CREATE OR REPLACE FUNCTION insert_bug_report(
  p_description TEXT,
  p_url TEXT
)
RETURNS bugs AS $$
DECLARE
  v_user_id UUID;
  v_bug bugs;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to report bugs';
  END IF;
  
  -- Insert bug report
  INSERT INTO bugs (user_id, description, url)
  VALUES (v_user_id, p_description, p_url)
  RETURNING * INTO v_bug;
  
  RETURN v_bug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_bug_report(TEXT, TEXT) TO authenticated;

