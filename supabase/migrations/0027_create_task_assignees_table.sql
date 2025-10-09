-- Create task_assignees table for many-to-many relationship between tasks and users
CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(task_id, user_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);

-- Add some sample data for testing
INSERT INTO task_assignees (task_id, user_id, assigned_by) 
SELECT 
  t.id as task_id,
  u.id as user_id,
  u.id as assigned_by
FROM tasks t
CROSS JOIN users u
WHERE u.email = 'design@renemoravec.sk'
LIMIT 3
ON CONFLICT (task_id, user_id) DO NOTHING;
