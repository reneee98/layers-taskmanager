-- Migration: Add function to get task workspace_id without RLS restrictions
-- Purpose: Allow API to get workspace_id from task even if RLS blocks access

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

