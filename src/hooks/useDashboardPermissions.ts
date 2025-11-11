"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardPermissions {
  show_stats_overview: boolean;
  show_tasks_section: boolean;
  show_activities_section: boolean;
  show_calendar_section: boolean;
  show_projects_section: boolean;
  show_clients_section: boolean;
  show_tab_all_active: boolean;
  show_tab_today: boolean;
  show_tab_sent_to_client: boolean;
  show_tab_in_progress: boolean;
  show_tab_unassigned: boolean;
  show_tab_overdue: boolean;
  show_tab_upcoming: boolean;
  show_stat_total_tasks: boolean;
  show_stat_completed_tasks: boolean;
  show_stat_in_progress_tasks: boolean;
  show_stat_total_hours: boolean;
  show_stat_completion_rate: boolean;
}

const DEFAULT_PERMISSIONS: DashboardPermissions = {
  show_stats_overview: true,
  show_tasks_section: true,
  show_activities_section: true,
  show_calendar_section: true,
  show_projects_section: true,
  show_clients_section: true,
  show_tab_all_active: true,
  show_tab_today: true,
  show_tab_sent_to_client: true,
  show_tab_in_progress: true,
  show_tab_unassigned: true,
  show_tab_overdue: true,
  show_tab_upcoming: true,
  show_stat_total_tasks: true,
  show_stat_completed_tasks: true,
  show_stat_in_progress_tasks: true,
  show_stat_total_hours: true,
  show_stat_completion_rate: true,
};

export function useDashboardPermissions() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<DashboardPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace || !user) {
      setLoading(false);
      return;
    }

    fetchPermissions();
  }, [workspace?.id, user?.id]);

  const fetchPermissions = async () => {
    if (!workspace || !user) return;

    try {
      const response = await fetch(
        `/api/workspaces/${workspace.id}/users/${user.id}/dashboard-permissions`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setPermissions(result.data);
      } else {
        // Use defaults if no permissions found
        setPermissions(DEFAULT_PERMISSIONS);
      }
    } catch (error) {
      console.error("Error fetching dashboard permissions:", error);
      // Use defaults on error
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  };

  return {
    permissions,
    loading,
    refreshPermissions: fetchPermissions,
  };
}

