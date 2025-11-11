-- Migration: Extend dashboard_permissions with more granular controls
-- Purpose: Add more detailed permissions for dashboard features
-- Date: 2025-11-11

-- Add new columns for header/quick actions
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS show_quick_task_button BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_workspace_invitations BOOLEAN DEFAULT true;

-- Add individual stat cards permissions (more granular than show_stats_overview)
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS show_stat_todo_tasks BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stat_overdue_tasks BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stat_upcoming_tasks BOOLEAN DEFAULT true;

-- Add task table column visibility
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS show_task_title_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_project_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_assignees_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_status_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_priority_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_deadline_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_actions_column BOOLEAN DEFAULT true;

-- Add view mode controls
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS show_view_mode_toggle BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_calendar_view_toggle BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_list_view BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_calendar_view BOOLEAN DEFAULT true;

-- Add activity section controls
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS show_activity_view_all_link BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_activity_count BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_activities_displayed INTEGER DEFAULT 10;

-- Add task actions permissions
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS allow_task_edit BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_task_delete BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_task_status_change BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_task_priority_change BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_task_assignee_change BOOLEAN DEFAULT true;

-- Add filtering and sorting permissions
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS allow_task_filtering BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_task_sorting BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN dashboard_permissions.show_quick_task_button IS 'Show/hide quick task creation button in header';
COMMENT ON COLUMN dashboard_permissions.show_workspace_invitations IS 'Show/hide workspace invitations section';
COMMENT ON COLUMN dashboard_permissions.show_stat_todo_tasks IS 'Show/hide "Na spracovanie" stat card';
COMMENT ON COLUMN dashboard_permissions.show_stat_overdue_tasks IS 'Show/hide "Prešli deadline" stat card';
COMMENT ON COLUMN dashboard_permissions.show_stat_upcoming_tasks IS 'Show/hide "Blížia sa" stat card';
COMMENT ON COLUMN dashboard_permissions.show_task_title_column IS 'Show/hide task title column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_project_column IS 'Show/hide project column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_assignees_column IS 'Show/hide assignees column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_status_column IS 'Show/hide status column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_priority_column IS 'Show/hide priority column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_deadline_column IS 'Show/hide deadline column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_actions_column IS 'Show/hide actions column in table';
COMMENT ON COLUMN dashboard_permissions.show_view_mode_toggle IS 'Show/hide list/calendar view toggle';
COMMENT ON COLUMN dashboard_permissions.show_calendar_view_toggle IS 'Show/hide month/week calendar toggle';
COMMENT ON COLUMN dashboard_permissions.allow_list_view IS 'Allow user to use list view';
COMMENT ON COLUMN dashboard_permissions.allow_calendar_view IS 'Allow user to use calendar view';
COMMENT ON COLUMN dashboard_permissions.show_activity_view_all_link IS 'Show/hide "View all activities" link';
COMMENT ON COLUMN dashboard_permissions.show_activity_count IS 'Show/hide activity count badge';
COMMENT ON COLUMN dashboard_permissions.max_activities_displayed IS 'Maximum number of activities to display';
COMMENT ON COLUMN dashboard_permissions.allow_task_edit IS 'Allow user to edit tasks from dashboard';
COMMENT ON COLUMN dashboard_permissions.allow_task_delete IS 'Allow user to delete tasks from dashboard';
COMMENT ON COLUMN dashboard_permissions.allow_task_status_change IS 'Allow user to change task status';
COMMENT ON COLUMN dashboard_permissions.allow_task_priority_change IS 'Allow user to change task priority';
COMMENT ON COLUMN dashboard_permissions.allow_task_assignee_change IS 'Allow user to change task assignees';
COMMENT ON COLUMN dashboard_permissions.allow_task_filtering IS 'Allow user to filter tasks';
COMMENT ON COLUMN dashboard_permissions.allow_task_sorting IS 'Allow user to sort tasks';

-- Update helper function to include new fields
DROP FUNCTION IF EXISTS get_dashboard_permissions(UUID, UUID);

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
  show_stat_completion_rate BOOLEAN,
  show_quick_task_button BOOLEAN,
  show_workspace_invitations BOOLEAN,
  show_stat_todo_tasks BOOLEAN,
  show_stat_overdue_tasks BOOLEAN,
  show_stat_upcoming_tasks BOOLEAN,
  show_task_title_column BOOLEAN,
  show_task_project_column BOOLEAN,
  show_task_assignees_column BOOLEAN,
  show_task_status_column BOOLEAN,
  show_task_priority_column BOOLEAN,
  show_task_deadline_column BOOLEAN,
  show_task_actions_column BOOLEAN,
  show_view_mode_toggle BOOLEAN,
  show_calendar_view_toggle BOOLEAN,
  allow_list_view BOOLEAN,
  allow_calendar_view BOOLEAN,
  show_activity_view_all_link BOOLEAN,
  show_activity_count BOOLEAN,
  max_activities_displayed INTEGER,
  allow_task_edit BOOLEAN,
  allow_task_delete BOOLEAN,
  allow_task_status_change BOOLEAN,
  allow_task_priority_change BOOLEAN,
  allow_task_assignee_change BOOLEAN,
  allow_task_filtering BOOLEAN,
  allow_task_sorting BOOLEAN
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
    COALESCE(dp.show_stat_completion_rate, true),
    COALESCE(dp.show_quick_task_button, true),
    COALESCE(dp.show_workspace_invitations, true),
    COALESCE(dp.show_stat_todo_tasks, true),
    COALESCE(dp.show_stat_overdue_tasks, true),
    COALESCE(dp.show_stat_upcoming_tasks, true),
    COALESCE(dp.show_task_title_column, true),
    COALESCE(dp.show_task_project_column, true),
    COALESCE(dp.show_task_assignees_column, true),
    COALESCE(dp.show_task_status_column, true),
    COALESCE(dp.show_task_priority_column, true),
    COALESCE(dp.show_task_deadline_column, true),
    COALESCE(dp.show_task_actions_column, true),
    COALESCE(dp.show_view_mode_toggle, true),
    COALESCE(dp.show_calendar_view_toggle, true),
    COALESCE(dp.allow_list_view, true),
    COALESCE(dp.allow_calendar_view, true),
    COALESCE(dp.show_activity_view_all_link, true),
    COALESCE(dp.show_activity_count, true),
    COALESCE(dp.max_activities_displayed, 10),
    COALESCE(dp.allow_task_edit, true),
    COALESCE(dp.allow_task_delete, true),
    COALESCE(dp.allow_task_status_change, true),
    COALESCE(dp.allow_task_priority_change, true),
    COALESCE(dp.allow_task_assignee_change, true),
    COALESCE(dp.allow_task_filtering, true),
    COALESCE(dp.allow_task_sorting, true)
  FROM dashboard_permissions dp
  WHERE dp.workspace_id = p_workspace_id 
    AND dp.user_id = p_user_id
  LIMIT 1;
  
  -- If no record exists, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      true, true, true, true, true, true,  -- sections
      true, true, true, true, true, true, true,  -- tabs
      true, true, true, true, true,  -- stats
      true, true,  -- header
      true, true, true,  -- individual stats
      true, true, true, true, true, true, true,  -- columns
      true, true, true, true,  -- view modes
      true, true, 10,  -- activities
      true, true, true, true, true,  -- task actions
      true, true;  -- filtering/sorting
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_dashboard_permissions IS 
  'Returns dashboard permissions for a user in a workspace, with defaults if not set (extended version)';

