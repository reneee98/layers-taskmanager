-- Create project_quick_links table
CREATE TABLE IF NOT EXISTS project_quick_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE project_quick_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view project quick links for their workspace projects"
  ON project_quick_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_quick_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project quick links for their workspace projects"
  ON project_quick_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_quick_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project quick links for their workspace projects"
  ON project_quick_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_quick_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project quick links for their workspace projects"
  ON project_quick_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_quick_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

-- Create index
CREATE INDEX idx_project_quick_links_project_id ON project_quick_links(project_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_quick_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_quick_links_updated_at
  BEFORE UPDATE ON project_quick_links
  FOR EACH ROW
  EXECUTE FUNCTION update_project_quick_links_updated_at();

-- Add comment for documentation
COMMENT ON TABLE project_quick_links IS 'Quick links for projects (e.g., Google Drive folders, documents, etc.)';

