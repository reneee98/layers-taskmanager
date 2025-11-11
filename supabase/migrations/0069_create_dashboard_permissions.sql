-- Migration: Create dashboard_permissions table
-- Purpose: Allow workspace owners to control what dashboard sections are visible to each member
-- Date: 2025-11-11

-- Create dashboard_permissions table
CREATE TABLE IF NOT EXISTS dashboard_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dashboard sections visibility (true = visible, false = hidden)
  show_stats_overview BOOLEAN DEFAULT true,
  show_tasks_section BOOLEAN DEFAULT true,
  show_activities_section BOOLEAN DEFAULT true,
  show_calendar_section BOOLEAN DEFAULT true,
  show_projects_section BOOLEAN DEFAULT true,
  show_clients_section BOOLEAN DEFAULT true,
  
  -- Task tabs visibility
  show_tab_all_active BOOLEAN DEFAULT true,
  show_tab_today BOOLEAN DEFAULT true,
  show_tab_sent_to_client BOOLEAN DEFAULT true,
  show_tab_in_progress BOOLEAN DEFAULT true,
  show_tab_unassigned BOOLEAN DEFAULT true,
  show_tab_overdue BOOLEAN DEFAULT true,
  show_tab_upcoming BOOLEAN DEFAULT true,
  
  -- Stats visibility
  show_stat_total_tasks BOOLEAN DEFAULT true,
  show_stat_completed_tasks BOOLEAN DEFAULT true,
  show_stat_in_progress_tasks BOOLEAN DEFAULT true,
  show_stat_total_hours BOOLEAN DEFAULT true,
  show_stat_completion_rate BOOLEAN DEFAULT true,
  
  -- Custom JSONB for future extensibility
  custom_settings JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One permission record per user per workspace
  UNIQUE(workspace_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_permissions_workspace_id ON dashboard_permissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_permissions_user_id ON dashboard_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_permissions_workspace_user ON dashboard_permissions(workspace_id, user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_dashboard_permissions_updated_at ON dashboard_permissions;
CREATE TRIGGER trigger_update_dashboard_permissions_updated_at
  BEFORE UPDATE ON dashboard_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_permissions_updated_at();

-- Enable RLS
ALTER TABLE dashboard_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own dashboard permissions
CREATE POLICY "Users can view own dashboard permissions" ON dashboard_permissions
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Workspace owners can view all dashboard permissions in their workspace
CREATE POLICY "Owners can view workspace dashboard permissions" ON dashboard_permissions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

-- Workspace owners can manage (insert/update/delete) dashboard permissions
CREATE POLICY "Owners can manage dashboard permissions" ON dashboard_permissions
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON dashboard_permissions TO authenticated;

-- Add comments
COMMENT ON TABLE dashboard_permissions IS 'Dashboard visibility permissions per user per workspace';
COMMENT ON COLUMN dashboard_permissions.show_stats_overview IS 'Show/hide stats overview section';
COMMENT ON COLUMN dashboard_permissions.show_tasks_section IS 'Show/hide tasks section';
COMMENT ON COLUMN dashboard_permissions.show_activities_section IS 'Show/hide activities section';
COMMENT ON COLUMN dashboard_permissions.show_calendar_section IS 'Show/hide calendar section';
COMMENT ON COLUMN dashboard_permissions.show_projects_section IS 'Show/hide projects section';
COMMENT ON COLUMN dashboard_permissions.show_clients_section IS 'Show/hide clients section';
COMMENT ON COLUMN dashboard_permissions.custom_settings IS 'Custom settings for future extensibility';

-- Create helper function to get dashboard permissions with defaults
CREATE OR REPLACE FUNCTION get_dashboard_permissions(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  show_stats_overview BOOLEAN,
  show_tasks_section BOOLEAN,
  show_activities_section BOOLEAN,
  show_calendar_section BOOLEAN,
  show_projects_section BOOLEAN,
  show_clients_section BOOLEAN,
  show_tab_all_active BOOLEAN,
  show_tab_today BOOLEAN,
  show_tab_sent_to_client BOOLEAN,
  show_tab_in_progress BOOLEAN,
  show_tab_unassigned BOOLEAN,
  show_tab_overdue BOOLEAN,
  show_tab_upcoming BOOLEAN,
  show_stat_total_tasks BOOLEAN,
  show_stat_completed_tasks BOOLEAN,
  show_stat_in_progress_tasks BOOLEAN,
  show_stat_total_hours BOOLEAN,
  show_stat_completion_rate BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(dp.show_stats_overview, true),
    COALESCE(dp.show_tasks_section, true),
    COALESCE(dp.show_activities_section, true),
    COALESCE(dp.show_calendar_section, true),
    COALESCE(dp.show_projects_section, true),
    COALESCE(dp.show_clients_section, true),
    COALESCE(dp.show_tab_all_active, true),
    COALESCE(dp.show_tab_today, true),
    COALESCE(dp.show_tab_sent_to_client, true),
    COALESCE(dp.show_tab_in_progress, true),
    COALESCE(dp.show_tab_unassigned, true),
    COALESCE(dp.show_tab_overdue, true),
    COALESCE(dp.show_tab_upcoming, true),
    COALESCE(dp.show_stat_total_tasks, true),
    COALESCE(dp.show_stat_completed_tasks, true),
    COALESCE(dp.show_stat_in_progress_tasks, true),
    COALESCE(dp.show_stat_total_hours, true),
    COALESCE(dp.show_stat_completion_rate, true)
  FROM dashboard_permissions dp
  WHERE dp.workspace_id = p_workspace_id 
    AND dp.user_id = p_user_id
  LIMIT 1;
  
  -- If no record exists, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      true, true, true, true, true, true,  -- sections
      true, true, true, true, true, true, true,  -- tabs
      true, true, true, true, true;  -- stats
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_dashboard_permissions IS 
  'Returns dashboard permissions for a user in a workspace, with defaults if not set';

GRANT EXECUTE ON FUNCTION get_dashboard_permissions(UUID, UUID) TO authenticated;

