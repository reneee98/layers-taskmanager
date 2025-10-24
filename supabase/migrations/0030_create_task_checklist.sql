-- Create task_checklist_items table for task sub-tasks/checklist functionality
CREATE TABLE task_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Add RLS policies
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Policy for workspace members to view checklist items
CREATE POLICY "Users can view task checklist items for their workspace tasks" ON task_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to insert checklist items
CREATE POLICY "Users can insert task checklist items for their workspace tasks" ON task_checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to update checklist items
CREATE POLICY "Users can update task checklist items for their workspace tasks" ON task_checklist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to delete checklist items
CREATE POLICY "Users can delete task checklist items for their workspace tasks" ON task_checklist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_task_checklist_items_task_id ON task_checklist_items(task_id);
CREATE INDEX idx_task_checklist_items_position ON task_checklist_items(task_id, position);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_task_checklist_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_checklist_items_updated_at
  BEFORE UPDATE ON task_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_task_checklist_items_updated_at();
