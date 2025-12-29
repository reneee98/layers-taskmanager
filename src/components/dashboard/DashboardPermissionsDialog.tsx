"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings2, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import type { DashboardPermissions } from "@/hooks/useDashboardPermissions";

interface DashboardPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  userId: string;
  userName: string;
}

export function DashboardPermissionsDialog({
  open,
  onOpenChange,
  workspaceId,
  userId,
  userName,
}: DashboardPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<DashboardPermissions>({
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
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && workspaceId && userId) {
      fetchPermissions();
    }
  }, [open, workspaceId, userId]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/workspaces/${workspaceId}/users/${userId}/dashboard-permissions`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setPermissions(result.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard permissions:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať nastavenia dashboardu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(
        `/api/workspaces/${workspaceId}/users/${userId}/dashboard-permissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(permissions),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: "Nastavenia dashboardu boli uložené",
        });
        onOpenChange(false);
      } else {
        throw new Error(result.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving dashboard permissions:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa uložiť nastavenia dashboardu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePermission = (key: keyof DashboardPermissions, value: boolean | number) => {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Nastavenie viditeľnosti dashboardu
          </DialogTitle>
          <DialogDescription>
            Nastavte, čo sa má zobrazovať používateľovi <strong>{userName}</strong> na dashboarde
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-6">
            {/* Sections */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Sekcie dashboardu</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_stats_overview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Prehľad štatistík
                  </Label>
                  <Switch
                    id="show_stats_overview"
                    checked={permissions.show_stats_overview}
                    onCheckedChange={(checked) =>
                      updatePermission("show_stats_overview", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_tasks_section" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Sekcia úloh
                  </Label>
                  <Switch
                    id="show_tasks_section"
                    checked={permissions.show_tasks_section}
                    onCheckedChange={(checked) =>
                      updatePermission("show_tasks_section", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_activities_section" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Posledná aktivita
                  </Label>
                  <Switch
                    id="show_activities_section"
                    checked={permissions.show_activities_section}
                    onCheckedChange={(checked) =>
                      updatePermission("show_activities_section", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_calendar_section" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Kalendár
                  </Label>
                  <Switch
                    id="show_calendar_section"
                    checked={permissions.show_calendar_section}
                    onCheckedChange={(checked) =>
                      updatePermission("show_calendar_section", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_projects_section" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Projekty
                  </Label>
                  <Switch
                    id="show_projects_section"
                    checked={permissions.show_projects_section}
                    onCheckedChange={(checked) =>
                      updatePermission("show_projects_section", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_clients_section" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Klienti
                  </Label>
                  <Switch
                    id="show_clients_section"
                    checked={permissions.show_clients_section}
                    onCheckedChange={(checked) =>
                      updatePermission("show_clients_section", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Task Tabs */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Záložky úloh</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_tab_all_active">Všetky aktívne</Label>
                  <Switch
                    id="show_tab_all_active"
                    checked={permissions.show_tab_all_active}
                    onCheckedChange={(checked) =>
                      updatePermission("show_tab_all_active", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_tab_today">Dnes</Label>
                  <Switch
                    id="show_tab_today"
                    checked={permissions.show_tab_today}
                    onCheckedChange={(checked) =>
                      updatePermission("show_tab_today", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_tab_sent_to_client">Odoslané klientovi</Label>
                  <Switch
                    id="show_tab_sent_to_client"
                    checked={permissions.show_tab_sent_to_client}
                    onCheckedChange={(checked) =>
                      updatePermission("show_tab_sent_to_client", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_tab_in_progress">Prebieha</Label>
                  <Switch
                    id="show_tab_in_progress"
                    checked={permissions.show_tab_in_progress}
                    onCheckedChange={(checked) =>
                      updatePermission("show_tab_in_progress", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_tab_unassigned">Nepriradené</Label>
                  <Switch
                    id="show_tab_unassigned"
                    checked={permissions.show_tab_unassigned}
                    onCheckedChange={(checked) =>
                      updatePermission("show_tab_unassigned", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_tab_overdue">Prekročené</Label>
                  <Switch
                    id="show_tab_overdue"
                    checked={permissions.show_tab_overdue}
                    onCheckedChange={(checked) =>
                      updatePermission("show_tab_overdue", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_tab_upcoming">Nadchádzajúce</Label>
                  <Switch
                    id="show_tab_upcoming"
                    checked={permissions.show_tab_upcoming}
                    onCheckedChange={(checked) =>
                      updatePermission("show_tab_upcoming", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Stats */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Štatistiky</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_stat_total_tasks">Celkový počet úloh</Label>
                  <Switch
                    id="show_stat_total_tasks"
                    checked={permissions.show_stat_total_tasks}
                    onCheckedChange={(checked) =>
                      updatePermission("show_stat_total_tasks", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_stat_completed_tasks">Dokončené úlohy</Label>
                  <Switch
                    id="show_stat_completed_tasks"
                    checked={permissions.show_stat_completed_tasks}
                    onCheckedChange={(checked) =>
                      updatePermission("show_stat_completed_tasks", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_stat_in_progress_tasks">Prebiehajúce úlohy</Label>
                  <Switch
                    id="show_stat_in_progress_tasks"
                    checked={permissions.show_stat_in_progress_tasks}
                    onCheckedChange={(checked) =>
                      updatePermission("show_stat_in_progress_tasks", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_stat_total_hours">Celkové hodiny</Label>
                  <Switch
                    id="show_stat_total_hours"
                    checked={permissions.show_stat_total_hours}
                    onCheckedChange={(checked) =>
                      updatePermission("show_stat_total_hours", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_stat_completion_rate">Miera dokončenia</Label>
                  <Switch
                    id="show_stat_completion_rate"
                    checked={permissions.show_stat_completion_rate}
                    onCheckedChange={(checked) =>
                      updatePermission("show_stat_completion_rate", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Header/Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Hlavička a akcie</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_quick_task_button">Tlačidlo rýchlej úlohy</Label>
                  <Switch
                    id="show_quick_task_button"
                    checked={permissions.show_quick_task_button}
                    onCheckedChange={(checked) =>
                      updatePermission("show_quick_task_button", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_workspace_invitations">Pozvánky do workspace</Label>
                  <Switch
                    id="show_workspace_invitations"
                    checked={permissions.show_workspace_invitations}
                    onCheckedChange={(checked) =>
                      updatePermission("show_workspace_invitations", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Individual Stat Cards */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Individuálne štatistiky</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_stat_todo_tasks">Na spracovanie</Label>
                  <Switch
                    id="show_stat_todo_tasks"
                    checked={permissions.show_stat_todo_tasks}
                    onCheckedChange={(checked) =>
                      updatePermission("show_stat_todo_tasks", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_stat_overdue_tasks">Prešli deadline</Label>
                  <Switch
                    id="show_stat_overdue_tasks"
                    checked={permissions.show_stat_overdue_tasks}
                    onCheckedChange={(checked) =>
                      updatePermission("show_stat_overdue_tasks", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_stat_upcoming_tasks">Blížia sa</Label>
                  <Switch
                    id="show_stat_upcoming_tasks"
                    checked={permissions.show_stat_upcoming_tasks}
                    onCheckedChange={(checked) =>
                      updatePermission("show_stat_upcoming_tasks", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Task Table Columns */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Stĺpce v tabuľke úloh</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_task_title_column">Názov úlohy</Label>
                  <Switch
                    id="show_task_title_column"
                    checked={permissions.show_task_title_column}
                    onCheckedChange={(checked) =>
                      updatePermission("show_task_title_column", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_task_project_column">Projekt</Label>
                  <Switch
                    id="show_task_project_column"
                    checked={permissions.show_task_project_column}
                    onCheckedChange={(checked) =>
                      updatePermission("show_task_project_column", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_task_assignees_column">Priradení</Label>
                  <Switch
                    id="show_task_assignees_column"
                    checked={permissions.show_task_assignees_column}
                    onCheckedChange={(checked) =>
                      updatePermission("show_task_assignees_column", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_task_status_column">Status</Label>
                  <Switch
                    id="show_task_status_column"
                    checked={permissions.show_task_status_column}
                    onCheckedChange={(checked) =>
                      updatePermission("show_task_status_column", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_task_priority_column">Priorita</Label>
                  <Switch
                    id="show_task_priority_column"
                    checked={permissions.show_task_priority_column}
                    onCheckedChange={(checked) =>
                      updatePermission("show_task_priority_column", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_task_deadline_column">Deadline</Label>
                  <Switch
                    id="show_task_deadline_column"
                    checked={permissions.show_task_deadline_column}
                    onCheckedChange={(checked) =>
                      updatePermission("show_task_deadline_column", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_task_actions_column">Akcie</Label>
                  <Switch
                    id="show_task_actions_column"
                    checked={permissions.show_task_actions_column}
                    onCheckedChange={(checked) =>
                      updatePermission("show_task_actions_column", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* View Modes */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Režimy zobrazenia</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_view_mode_toggle">Zobraziť prepínač zoznam/kalendár</Label>
                  <Switch
                    id="show_view_mode_toggle"
                    checked={permissions.show_view_mode_toggle}
                    onCheckedChange={(checked) =>
                      updatePermission("show_view_mode_toggle", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_calendar_view_toggle">Zobraziť prepínač mesiac/týždeň</Label>
                  <Switch
                    id="show_calendar_view_toggle"
                    checked={permissions.show_calendar_view_toggle}
                    onCheckedChange={(checked) =>
                      updatePermission("show_calendar_view_toggle", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_list_view">Povoliť zoznam</Label>
                  <Switch
                    id="allow_list_view"
                    checked={permissions.allow_list_view}
                    onCheckedChange={(checked) =>
                      updatePermission("allow_list_view", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_calendar_view">Povoliť kalendár</Label>
                  <Switch
                    id="allow_calendar_view"
                    checked={permissions.allow_calendar_view}
                    onCheckedChange={(checked) =>
                      updatePermission("allow_calendar_view", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Activities */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Aktivita</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_activity_view_all_link">Odkaz "Zobraziť celú aktivitu"</Label>
                  <Switch
                    id="show_activity_view_all_link"
                    checked={permissions.show_activity_view_all_link}
                    onCheckedChange={(checked) =>
                      updatePermission("show_activity_view_all_link", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_activity_count">Počet aktivít</Label>
                  <Switch
                    id="show_activity_count"
                    checked={permissions.show_activity_count}
                    onCheckedChange={(checked) =>
                      updatePermission("show_activity_count", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="max_activities_displayed">Max. počet aktivít</Label>
                  <Input
                    id="max_activities_displayed"
                    type="number"
                    min="1"
                    max="100"
                    value={permissions.max_activities_displayed}
                    onChange={(e) =>
                      updatePermission("max_activities_displayed", parseInt(e.target.value) || 10)
                    }
                    className="w-20"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Task Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Akcie s úlohami</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_task_edit">Upraviť úlohu</Label>
                  <Switch
                    id="allow_task_edit"
                    checked={permissions.allow_task_edit}
                    onCheckedChange={(checked) =>
                      updatePermission("allow_task_edit", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_task_delete">Vymazať úlohu</Label>
                  <Switch
                    id="allow_task_delete"
                    checked={permissions.allow_task_delete}
                    onCheckedChange={(checked) =>
                      updatePermission("allow_task_delete", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_task_status_change">Zmeniť status</Label>
                  <Switch
                    id="allow_task_status_change"
                    checked={permissions.allow_task_status_change}
                    onCheckedChange={(checked) =>
                      updatePermission("allow_task_status_change", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_task_priority_change">Zmeniť prioritu</Label>
                  <Switch
                    id="allow_task_priority_change"
                    checked={permissions.allow_task_priority_change}
                    onCheckedChange={(checked) =>
                      updatePermission("allow_task_priority_change", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_task_assignee_change">Zmeniť priradených</Label>
                  <Switch
                    id="allow_task_assignee_change"
                    checked={permissions.allow_task_assignee_change}
                    onCheckedChange={(checked) =>
                      updatePermission("allow_task_assignee_change", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Filtering/Sorting */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Filtrovanie a triedenie</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_task_filtering">Povoliť filtrovanie</Label>
                  <Switch
                    id="allow_task_filtering"
                    checked={permissions.allow_task_filtering}
                    onCheckedChange={(checked) =>
                      updatePermission("allow_task_filtering", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_task_sorting">Povoliť triedenie</Label>
                  <Switch
                    id="allow_task_sorting"
                    checked={permissions.allow_task_sorting}
                    onCheckedChange={(checked) =>
                      updatePermission("allow_task_sorting", checked)
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušiť
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Ukladám..." : "Uložiť"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

