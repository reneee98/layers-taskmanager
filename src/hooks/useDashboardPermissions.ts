"use client";

import { useState, useEffect, useRef } from "react";
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

// Cache key for localStorage
const CACHE_KEY = 'dashboard_permissions_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface CachedPermissions {
  permissions: DashboardPermissions;
  workspaceId: string;
  userId: string;
  timestamp: number;
}

export function useDashboardPermissions() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<DashboardPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);

  // Load from cache on mount
  useEffect(() => {
    if (!workspace?.id || !user?.id) return;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CachedPermissions = JSON.parse(cached);
        const isValid = 
          data.workspaceId === workspace.id && 
          data.userId === user.id &&
          Date.now() - data.timestamp < CACHE_EXPIRY;
        
        if (isValid) {
          setPermissions(data.permissions);
          setHasLoaded(true);
          setLoading(false);
        }
      }
    } catch {
      // Ignore cache errors
    }
  }, [workspace?.id, user?.id]);

  const fetchPermissions = async () => {
    if (!workspace || !user) return;
    
    const fetchKey = `${workspace.id}-${user.id}`;
    
    // Prevent duplicate fetches
    if (isFetchingRef.current || lastFetchKeyRef.current === fetchKey) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchKeyRef.current = fetchKey;

    try {
      const response = await fetch(
        `/api/workspaces/${workspace.id}/users/${user.id}/dashboard-permissions`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();

      if (result.success && result.data) {
        const mergedPermissions = { ...DEFAULT_PERMISSIONS, ...result.data };
        setPermissions(mergedPermissions);
        setHasLoaded(true);
        setLoading(false);
        
        // Save to cache
        try {
          const cacheData: CachedPermissions = {
            permissions: mergedPermissions,
            workspaceId: workspace.id,
            userId: user.id,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch {
          // Ignore cache errors
        }
      } else {
        setHasLoaded(true);
        setLoading(false);
      }
    } catch {
      // Keep using DEFAULT_PERMISSIONS which are already set
      setHasLoaded(true);
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!workspace || !user) return;
    
    // Only fetch if not already loaded from cache
    if (!hasLoaded) {
      fetchPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id, user?.id]);

  // Show default permissions immediately for faster perceived load
  // This allows content to render while permissions are being fetched
  return {
    permissions: hasLoaded ? permissions : DEFAULT_PERMISSIONS,
    loading,
    refreshPermissions: fetchPermissions,
  };
}
