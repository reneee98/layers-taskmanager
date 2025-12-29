-- Create storage bucket for task files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-files', 
  'task-files', 
  true, 
  10485760, -- 10MB limit
  ARRAY[
    'image/*', 
    'application/pdf', 
    'text/*', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view their workspace task files
CREATE POLICY "Allow authenticated users to view their workspace task files"
ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'task-files' AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = (regexp_match(name, '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/.*$'))[1]::uuid
    AND wm.user_id = auth.uid()
  )
);

-- Policy for authenticated users to upload to their workspace task files
CREATE POLICY "Allow authenticated users to upload to their workspace task files"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'task-files' AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = (regexp_match(name, '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/.*$'))[1]::uuid
    AND wm.user_id = auth.uid()
  )
);

-- Policy for authenticated users to delete their workspace task files
CREATE POLICY "Allow authenticated users to delete their workspace task files"
ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'task-files' AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = (regexp_match(name, '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/.*$'))[1]::uuid
    AND wm.user_id = auth.uid()
  )
);
