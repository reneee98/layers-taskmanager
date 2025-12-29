-- Migration: Create activities table for real-time activity logging (Simple version)
-- Purpose: Store user activities in real-time for better tracking

-- Create activities table without foreign key constraints first
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  project_id UUID,
  task_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activities_workspace_id ON activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_task_id ON activities(task_id);

-- Add comments for documentation
COMMENT ON TABLE activities IS 'Real-time activity log for user actions';
COMMENT ON COLUMN activities.type IS 'Type of activity: task_created, task_updated, task_completed, time_added, comment_added, etc.';
COMMENT ON COLUMN activities.action IS 'Human-readable action description';
COMMENT ON COLUMN activities.details IS 'Additional details like task title, description';
COMMENT ON COLUMN activities.metadata IS 'JSON data with additional context like old/new values, status changes';

-- Verify the table was created
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'activities' 
ORDER BY ordinal_position;
