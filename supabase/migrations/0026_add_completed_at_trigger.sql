-- Add trigger to automatically set completed_at when status changes to 'done'
-- This migration creates a trigger that sets completed_at timestamp when task status becomes 'done'

-- Create function to handle completed_at update
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being changed to 'done' and completed_at is not already set
  IF NEW.status = 'done' AND OLD.status != 'done' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- If status is being changed away from 'done', clear completed_at
  IF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tasks table
CREATE TRIGGER trigger_set_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();

-- Add comment to explain the trigger
COMMENT ON TRIGGER trigger_set_completed_at ON tasks IS 'Automatically sets completed_at when status changes to done';
