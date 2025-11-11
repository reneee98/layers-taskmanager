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

  const updatePermission = (key: keyof DashboardPermissions, value: boolean) => {
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
                  <Label htmlFor="show_tab_sent_to_client">Poslané klientovi</Label>
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

