-- Migration: Add function to get task workspace_id without RLS restrictions
-- Purpose: Allow API to get workspace_id from task even if RLS blocks access

-- Drop existing function if it exists (with any parameter name)
-- PostgreSQL requires specifying parameter types for DROP FUNCTION
DROP FUNCTION IF EXISTS get_task_workspace_id(UUID);
DROP FUNCTION IF EXISTS get_task_workspace_id(uuid);
-- Also try dropping with old parameter name if it exists
DO $$ 
BEGIN
  -- Try to drop function with old parameter name
  EXECUTE 'DROP FUNCTION IF EXISTS get_task_workspace_id(p_task_id UUID)';
  EXECUTE 'DROP FUNCTION IF EXISTS get_task_workspace_id(p_task_id uuid)';
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if function doesn't exist
    NULL;
END $$;

-- Create function to get task workspace_id
CREATE OR REPLACE FUNCTION get_task_workspace_id(task_id_param UUID)
RETURNS UUID AS $$
DECLARE
  result_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO result_workspace_id
  FROM tasks
  WHERE id = task_id_param;
  
  RETURN result_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_task_workspace_id(UUID) TO authenticated;

