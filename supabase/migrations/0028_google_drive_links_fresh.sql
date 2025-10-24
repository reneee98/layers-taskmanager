-- Drop existing table if exists
DROP TABLE IF EXISTS google_drive_links CASCADE;

-- Create google_drive_links table
CREATE TABLE google_drive_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE google_drive_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view google drive links for their workspace tasks"
  ON google_drive_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = google_drive_links.task_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert google drive links for their workspace tasks"
  ON google_drive_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = google_drive_links.task_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update google drive links for their workspace tasks"
  ON google_drive_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = google_drive_links.task_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete google drive links for their workspace tasks"
  ON google_drive_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = google_drive_links.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Create index
CREATE INDEX idx_google_drive_links_task_id ON google_drive_links(task_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_google_drive_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_google_drive_links_updated_at
  BEFORE UPDATE ON google_drive_links
  FOR EACH ROW
  EXECUTE FUNCTION update_google_drive_links_updated_at();

