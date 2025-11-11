"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardPermissions {
  // Sections
  show_stats_overview: boolean;
  show_tasks_section: boolean;
  show_activities_section: boolean;
  show_calendar_section: boolean;
  show_projects_section: boolean;
  show_clients_section: boolean;
  
  // Tabs
  show_tab_all_active: boolean;
  show_tab_today: boolean;
  show_tab_sent_to_client: boolean;
  show_tab_in_progress: boolean;
  show_tab_unassigned: boolean;
  show_tab_overdue: boolean;
  show_tab_upcoming: boolean;
  
  // Stats
  show_stat_total_tasks: boolean;
  show_stat_completed_tasks: boolean;
  show_stat_in_progress_tasks: boolean;
  show_stat_total_hours: boolean;
  show_stat_completion_rate: boolean;
  
  // Header/Actions
  show_quick_task_button: boolean;
  show_workspace_invitations: boolean;
  
  // Individual Stats
  show_stat_todo_tasks: boolean;
  show_stat_overdue_tasks: boolean;
  show_stat_upcoming_tasks: boolean;
  
  // Task Table Columns
  show_task_title_column: boolean;
  show_task_project_column: boolean;
  show_task_assignees_column: boolean;
  show_task_status_column: boolean;
  show_task_priority_column: boolean;
  show_task_deadline_column: boolean;
  show_task_actions_column: boolean;
  
  // View Modes
  show_view_mode_toggle: boolean;
  show_calendar_view_toggle: boolean;
  allow_list_view: boolean;
  allow_calendar_view: boolean;
  
  // Activities
  show_activity_view_all_link: boolean;
  show_activity_count: boolean;
  max_activities_displayed: number;
  
  // Task Actions
  allow_task_edit: boolean;
  allow_task_delete: boolean;
  allow_task_status_change: boolean;
  allow_task_priority_change: boolean;
  allow_task_assignee_change: boolean;
  
  // Filtering/Sorting
  allow_task_filtering: boolean;
  allow_task_sorting: boolean;
}

const DEFAULT_PERMISSIONS: DashboardPermissions = {
  // Sections
  show_stats_overview: true,
  show_tasks_section: true,
  show_activities_section: true,
  show_calendar_section: true,
  show_projects_section: true,
  show_clients_section: true,
  
  // Tabs
  show_tab_all_active: true,
  show_tab_today: true,
  show_tab_sent_to_client: true,
  show_tab_in_progress: true,
  show_tab_unassigned: true,
  show_tab_overdue: true,
  show_tab_upcoming: true,
  
  // Stats
  show_stat_total_tasks: true,
  show_stat_completed_tasks: true,
  show_stat_in_progress_tasks: true,
  show_stat_total_hours: true,
  show_stat_completion_rate: true,
  
  // Header/Actions
  show_quick_task_button: true,
  show_workspace_invitations: true,
  
  // Individual Stats
  show_stat_todo_tasks: true,
  show_stat_overdue_tasks: true,
  show_stat_upcoming_tasks: true,
  
  // Task Table Columns
  show_task_title_column: true,
  show_task_project_column: true,
  show_task_assignees_column: true,
  show_task_status_column: true,
  show_task_priority_column: true,
  show_task_deadline_column: true,
  show_task_actions_column: true,
  
  // View Modes
  show_view_mode_toggle: true,
  show_calendar_view_toggle: true,
  allow_list_view: true,
  allow_calendar_view: true,
  
  // Activities
  show_activity_view_all_link: true,
  show_activity_count: true,
  max_activities_displayed: 10,
  
  // Task Actions
  allow_task_edit: true,
  allow_task_delete: true,
  allow_task_status_change: true,
  allow_task_priority_change: true,
  allow_task_assignee_change: true,
  
  // Filtering/Sorting
  allow_task_filtering: true,
  allow_task_sorting: true,
};

export function useDashboardPermissions() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<DashboardPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true); // Start with true - wait for permissions to load
  const [hasLoaded, setHasLoaded] = useState(false); // Track if permissions have been loaded at least once

  const fetchPermissions = async () => {
    if (!workspace || !user) {
      console.log('[useDashboardPermissions] Missing workspace or user');
      return;
    }

    try {
      console.log('[useDashboardPermissions] Fetching permissions for:', {
        workspaceId: workspace.id,
        userId: user.id
      });

      // Fetch without timeout - permissions are critical
      const response = await fetch(
        `/api/workspaces/${workspace.id}/users/${user.id}/dashboard-permissions`
      );
      
      console.log('[useDashboardPermissions] Response status:', response.status, response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useDashboardPermissions] HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[useDashboardPermissions] Response data:', result);
      console.log('[useDashboardPermissions] Response data.show_stats_overview:', result.data?.show_stats_overview);
      console.log('[useDashboardPermissions] Response data.show_activities_section:', result.data?.show_activities_section);
      console.log('[useDashboardPermissions] Response data.show_tasks_section:', result.data?.show_tasks_section);

      if (result.success && result.data) {
        // Merge with defaults to ensure all fields are present
        const mergedPermissions = { ...DEFAULT_PERMISSIONS, ...result.data };
        console.log('[useDashboardPermissions] Merged permissions:', {
          show_tasks_section: mergedPermissions.show_tasks_section,
          show_activities_section: mergedPermissions.show_activities_section,
          show_stats_overview: mergedPermissions.show_stats_overview,
        });
        console.log('[useDashboardPermissions] About to set permissions, current state:', permissions);
        setPermissions(mergedPermissions);
        setHasLoaded(true);
        setLoading(false);
        console.log('[useDashboardPermissions] Permissions set and loaded');
      } else {
        console.warn('[useDashboardPermissions] Response not successful or missing data:', result);
        setHasLoaded(true);
        setLoading(false);
      }
    } catch (error: any) {
      console.error('[useDashboardPermissions] Error fetching permissions:', error);
      // Keep using DEFAULT_PERMISSIONS which are already set
      setHasLoaded(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!workspace || !user) {
      console.log('[useDashboardPermissions] useEffect: Missing workspace or user');
      return;
    }

    console.log('[useDashboardPermissions] useEffect: Fetching permissions', {
      workspaceId: workspace.id,
      userId: user.id
    });
    // Fetch in background - don't block UI
    fetchPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id, user?.id]);

  // Return empty permissions (all false) until loaded, then use actual permissions
  // This prevents showing everything before permissions are loaded
  const emptyPermissions: DashboardPermissions = {
    show_stats_overview: false,
    show_tasks_section: false,
    show_activities_section: false,
    show_calendar_section: false,
    show_projects_section: false,
    show_clients_section: false,
    show_tab_all_active: false,
    show_tab_today: false,
    show_tab_sent_to_client: false,
    show_tab_in_progress: false,
    show_tab_unassigned: false,
    show_tab_overdue: false,
    show_tab_upcoming: false,
    show_stat_total_tasks: false,
    show_stat_completed_tasks: false,
    show_stat_in_progress_tasks: false,
    show_stat_total_hours: false,
    show_stat_completion_rate: false,
    show_quick_task_button: false,
    show_workspace_invitations: false,
    show_stat_todo_tasks: false,
    show_stat_overdue_tasks: false,
    show_stat_upcoming_tasks: false,
    show_task_title_column: false,
    show_task_project_column: false,
    show_task_assignees_column: false,
    show_task_status_column: false,
    show_task_priority_column: false,
    show_task_deadline_column: false,
    show_task_actions_column: false,
    show_view_mode_toggle: false,
    show_calendar_view_toggle: false,
    allow_list_view: false,
    allow_calendar_view: false,
    show_activity_view_all_link: false,
    show_activity_count: false,
    max_activities_displayed: 10,
    allow_task_edit: false,
    allow_task_delete: false,
    allow_task_status_change: false,
    allow_task_priority_change: false,
    allow_task_assignee_change: false,
    allow_task_filtering: false,
    allow_task_sorting: false,
  };

  return {
    permissions: hasLoaded ? permissions : emptyPermissions, // Use empty (all false) until loaded
    loading,
    refreshPermissions: fetchPermissions,
  };
}

