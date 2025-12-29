-- Create storage bucket for task files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-files',
  'task-files',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Create RLS policies for task files
CREATE POLICY "Users can view task files for their workspace tasks" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-files' AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = (storage.foldername(name))[1]::uuid
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload task files for their workspace tasks" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-files' AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = (storage.foldername(name))[1]::uuid
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update task files for their workspace tasks" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'task-files' AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = (storage.foldername(name))[1]::uuid
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete task files for their workspace tasks" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-files' AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = (storage.foldername(name))[1]::uuid
      AND wm.user_id = auth.uid()
    )
  );
