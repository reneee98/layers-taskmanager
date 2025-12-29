"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Plus, ChevronDown, Percent } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermissions";
import { useWorkspaceUsers } from "@/contexts/WorkspaceUsersContext";
import { formatCurrency } from "@/lib/format";

interface TaskSettingsPanelProps {
  taskId: string;
  task?: {
    id: string;
    title: string;
    project_id: string | null;
    budget_cents: number | null;
    sales_commission_enabled?: boolean;
    sales_commission_user_id?: string | null;
    sales_commission_percent?: number | null;
  };
  projects?: Array<{
    id: string;
    name: string;
    code?: string | null;
  }>;
  onTaskUpdate?: () => void;
}

export function TaskSettingsPanel({ 
  taskId, 
  task, 
  projects = [],
  onTaskUpdate 
}: TaskSettingsPanelProps) {
  const { hasPermission: canUpdateTasks } = usePermission('tasks', 'update');
  
  // Get clients instead of users for sales commission
  const [clients, setClients] = useState<Array<{
    id: string;
    name: string;
    email: string | null;
  }>>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState(task?.title || "");
  const [projectId, setProjectId] = useState(task?.project_id || "none");
  const [budget, setBudget] = useState(task?.budget_cents ? (task.budget_cents / 100).toString() : "");
  const [salesCommissionEnabled, setSalesCommissionEnabled] = useState(task?.sales_commission_enabled || false);
  const [salesCommissionUserId, setSalesCommissionUserId] = useState(
    task?.sales_commission_user_id && task.sales_commission_user_id !== null 
      ? task.sales_commission_user_id 
      : "none"
  );
  const [salesCommissionPercent, setSalesCommissionPercent] = useState(task?.sales_commission_percent?.toString() || "10");
  
  // Assignees state
  const [assignees, setAssignees] = useState<Array<{
    id: string;
    user_id: string;
    hourly_rate_cents: number | null;
    user?: {
      id: string;
      name: string;
      email?: string;
      role?: string;
    };
  }>>([]);
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(true);
  
  // Finance data for calculating commission with extra
  const [financeData, setFinanceData] = useState<{
    budgetAmount: number;
    totalCost: number;
    extra: number;
  } | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setProjectId(task.project_id || "none");
      setBudget(task.budget_cents ? (task.budget_cents / 100).toString() : "");
      // Only update commission settings if they are explicitly provided (not undefined)
      // This prevents resetting to default values when task is refetched
      if (task.sales_commission_enabled !== undefined) {
        setSalesCommissionEnabled(task.sales_commission_enabled);
      }
      if (task.sales_commission_user_id !== undefined) {
        // Convert null/empty to "none" for the select component
        setSalesCommissionUserId(
          task.sales_commission_user_id && task.sales_commission_user_id !== null
            ? task.sales_commission_user_id
            : "none"
        );
      }
      if (task.sales_commission_percent !== undefined && task.sales_commission_percent !== null) {
        setSalesCommissionPercent(task.sales_commission_percent.toString());
      } else if (task.sales_commission_percent === null && task.sales_commission_enabled) {
        // If commission is enabled but percent is null, keep current value or default to 10
        setSalesCommissionPercent(salesCommissionPercent || "10");
      }
    }
  }, [task]);

  useEffect(() => {
    fetchAssignees();
    fetchClients();
    fetchFinanceData();
  }, [taskId]);
  
  const fetchFinanceData = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/finance`);
      const result = await response.json();
      if (result.success && result.data) {
        const budgetAmount = result.data.budgetAmount || 0;
        const totalCost = result.data.totalCost || 0;
        const extra = totalCost > budgetAmount ? (totalCost - budgetAmount) : 0;
        setFinanceData({
          budgetAmount,
          totalCost,
          extra,
        });
      }
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
    }
  };
  
  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const response = await fetch("/api/clients");
      const result = await response.json();
      if (result.success && result.data) {
        setClients(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const fetchAssignees = async () => {
    setIsLoadingAssignees(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/assignees`);
      const result = await response.json();
      if (result.success && result.data) {
        setAssignees(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch assignees:", error);
    } finally {
      setIsLoadingAssignees(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!canUpdateTasks) {
      toast({
        title: "Chyba",
        description: "Nemáte oprávnenie na úpravu úlohy",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          project_id: projectId && projectId !== "none" ? projectId : null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: "Úspech", description: "Zmeny boli uložené" });
        onTaskUpdate?.();
      } else {
        throw new Error(result.error || "Nepodarilo sa uložiť zmeny");
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa uložiť zmeny",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFinance = async () => {
    if (!canUpdateTasks) {
      toast({
        title: "Chyba",
        description: "Nemáte oprávnenie na úpravu úlohy",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsSaving(true);
    try {
      const budgetCents = budget ? Math.round(parseFloat(budget) * 100) : null;
      // Commission percent should be set only if commission is enabled
      // If disabled, set to null to clear it
      let commissionPercent: number | null = null;
      if (salesCommissionEnabled && salesCommissionPercent) {
        const parsed = parseFloat(salesCommissionPercent.toString());
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          commissionPercent = parsed;
        }
      }

      // Prepare sales_commission_user_id - convert "none" or empty string to null
      // Only set client ID if commission is enabled and a valid client is selected
      let commissionUserId: string | null = null;
      if (salesCommissionEnabled && salesCommissionUserId && salesCommissionUserId !== "none" && salesCommissionUserId !== "") {
        // Validate that it's a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(salesCommissionUserId)) {
          commissionUserId = salesCommissionUserId;
        } else {
          console.error("Invalid client ID format:", salesCommissionUserId);
          toast({
            title: "Chyba",
            description: "Neplatné ID klienta",
            variant: "destructive",
          });
          setIsSaving(false);
          setIsLoading(false);
          return;
        }
      }

      const requestBody = {
        budget_cents: budgetCents,
        sales_commission_enabled: salesCommissionEnabled,
        sales_commission_user_id: commissionUserId,
        sales_commission_percent: commissionPercent,
      };

      console.log("Saving finance settings:", requestBody);

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", response.status, errorText);
        let errorMessage = "Nepodarilo sa uložiť zmeny";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Save result:", result);

      if (result.success) {
        toast({ title: "Úspech", description: "Finančné nastavenia boli uložené" });
        // Wait a bit before refetching to ensure database is updated
        setTimeout(() => {
          onTaskUpdate?.();
          setIsSaving(false);
        }, 500);
      } else {
        console.error("Failed to save finance settings:", result);
        throw new Error(result.error || result.message || "Nepodarilo sa uložiť zmeny");
      }
    } catch (error) {
      setIsSaving(false);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa uložiť zmeny",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAssigneeRate = async (assigneeId: string, rate: string) => {
    if (!canUpdateTasks) return;

    const rateCents = rate ? Math.round(parseFloat(rate) * 100) : null;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/assignees/${assigneeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourly_rate_cents: rateCents,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchAssignees();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa aktualizovať sadzbu",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: "bg-blue-100", text: "text-blue-600" },
      { bg: "bg-green-100", text: "text-green-600" },
      { bg: "bg-purple-100", text: "text-purple-600" },
      { bg: "bg-amber-100", text: "text-amber-600" },
      { bg: "bg-pink-100", text: "text-pink-600" },
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const salesPerson = clients.find(c => c.id === salesCommissionUserId);

  if (!taskId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Chýba ID úlohy
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Všeobecné informácie */}
      <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <CardHeader className="pb-0 pt-[25px] px-[25px]">
          <CardTitle className="text-[14px] font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px]">
            Všeobecné informácie
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-[30px] px-[25px] pb-[25px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title" className="text-[14px] font-medium text-[#0a0a0a] dark:text-foreground tracking-[-0.1504px]">
                Názov úlohy
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveGeneral}
                disabled={!canUpdateTasks || isLoading}
                className="bg-[#f3f3f5] dark:bg-muted border-0 h-9 rounded-[8px] text-[14px] tracking-[-0.1504px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project" className="text-[14px] font-medium text-[#0a0a0a] dark:text-foreground tracking-[-0.1504px]">
                Projekt
              </Label>
              <Select
                value={projectId || "none"}
                onValueChange={(value) => {
                  const newProjectId = value === "none" ? "" : value;
                  setProjectId(newProjectId);
                  // Auto-save on change
                  setTimeout(() => {
                    const event = new Event('blur');
                    document.getElementById('title')?.dispatchEvent(event);
                  }, 100);
                }}
                disabled={!canUpdateTasks || isLoading}
              >
                <SelectTrigger className="bg-[#f3f3f5] dark:bg-muted border-0 h-9 rounded-[8px] text-[14px] tracking-[-0.1504px]">
                  <SelectValue placeholder="Vyberte projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Bez projektu</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code ? `${project.code} - ${project.name}` : project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financie */}
      <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <CardHeader className="pb-0 pt-[25px] px-[25px]">
          <CardTitle className="text-[14px] font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px]">
            Financie
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-[30px] px-[25px] pb-[25px]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 w-full md:w-[309px]">
              <Label htmlFor="budget" className="text-[14px] font-medium text-[#0a0a0a] dark:text-foreground tracking-[-0.1504px]">
                Budget (€)
              </Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                onBlur={handleSaveFinance}
                disabled={!canUpdateTasks || isLoading}
                className="bg-[#f3f3f5] dark:bg-muted border-0 h-9 rounded-[8px] text-[14px] tracking-[-0.1504px]"
              />
            </div>

            {/* Obchodná provízia */}
            <div className="flex flex-col gap-6">
              <div className="bg-[rgba(255,251,235,0.1)] dark:bg-amber-900/10 border-b border-[rgba(255,251,235,0.5)] dark:border-amber-800/50 -mx-[1px] -mt-6 px-6 py-6 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <CardTitle className="text-[14px] font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px]">
                      Obchodná provízia
                    </CardTitle>
                  </div>
                  <p className="text-[12px] text-[#717182] dark:text-muted-foreground">
                    Odpočítať % z budgetu pre obchodníka.
                  </p>
                </div>
                <Switch
                  checked={salesCommissionEnabled}
                  onCheckedChange={(checked) => {
                    setSalesCommissionEnabled(checked);
                    // Don't auto-save immediately - let user configure settings first
                    // Will save when user changes other fields or on blur
                  }}
                  disabled={!canUpdateTasks || isLoading}
                />
              </div>

              {salesCommissionEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="salesPerson" className="text-[14px] font-medium text-[#0a0a0a] dark:text-foreground tracking-[-0.1504px]">
                      Obchodník
                    </Label>
                    <Select
                      value={salesCommissionUserId || "none"}
                      onValueChange={(value) => {
                        // Keep "none" as "none" for the state, convert to null when saving
                        setSalesCommissionUserId(value);
                        // Save after a short delay to allow user to finish selecting
                        setTimeout(() => handleSaveFinance(), 300);
                      }}
                      disabled={!canUpdateTasks || isLoading || isLoadingClients}
                    >
                      <SelectTrigger className="bg-[#f3f3f5] dark:bg-muted border-0 h-9 rounded-[8px] text-[14px] tracking-[-0.1504px]">
                        <SelectValue placeholder="Vyberte obchodníka">
                          {salesCommissionUserId && salesCommissionUserId !== "none" 
                            ? clients.find(c => c.id === salesCommissionUserId)?.name || "Neznámy"
                            : "Vyberte obchodníka"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Žiadny</SelectItem>
                        {isLoadingClients ? (
                          <SelectItem value="loading" disabled>Načítavam...</SelectItem>
                        ) : (
                          clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="commissionPercent" className="text-[14px] font-medium text-[#0a0a0a] dark:text-foreground tracking-[-0.1504px]">
                      Podiel (%)
                    </Label>
                    <div className="relative">
                      <Input
                        id="commissionPercent"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={salesCommissionPercent}
                        onChange={(e) => setSalesCommissionPercent(e.target.value)}
                        onBlur={handleSaveFinance}
                        disabled={!canUpdateTasks || isLoading}
                        className="bg-[#f3f3f5] dark:bg-muted border-0 h-9 rounded-[8px] text-[14px] tracking-[-0.1504px] pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#90a1b9] dark:text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Display current settings summary */}
              {salesCommissionEnabled && (
                <div className="mt-4 p-4 bg-[#f8fafc] dark:bg-muted/30 border border-[#e2e8f0] dark:border-border rounded-[8px]">
                  <p className="text-[12px] font-medium text-[#314158] dark:text-foreground mb-2">
                    Aktuálne nastavenia:
                  </p>
                  <div className="flex flex-col gap-1 text-[11px] text-[#62748e] dark:text-muted-foreground">
                    <p>
                      Obchodník: {salesCommissionUserId && salesCommissionUserId !== "none" 
                        ? clients.find(c => c.id === salesCommissionUserId)?.name || "Neznámy"
                        : "Nie je vybraný"}
                    </p>
                    <p>
                      Podiel: {salesCommissionPercent ? `${salesCommissionPercent}%` : "Nie je nastavený"}
                    </p>
                    {financeData && (
                      <p>
                        Provízia z celkovej sumy: {formatCurrency(
                          (financeData.budgetAmount + financeData.extra) * (parseFloat(salesCommissionPercent || "0") / 100)
                        )}
                      </p>
                    )}
                    {financeData && financeData.extra > 0 && (
                      <p className="text-[10px] text-[#90a1b9] dark:text-muted-foreground">
                        (Budget: {formatCurrency(financeData.budgetAmount)} + Extra: {formatCurrency(financeData.extra)})
                      </p>
                    )}
                    {financeData && financeData.extra === 0 && (
                      <p className="text-[10px] text-[#90a1b9] dark:text-muted-foreground">
                        (Provízia sa počíta z celkovej sumy vrátane extra T&M)
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priradení členovia tímu */}
      <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <CardHeader className="border-b border-[#f1f5f9] dark:border-border h-[77px] pb-0 pt-0 px-6 flex items-center justify-between">
          <CardTitle className="text-[14px] font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px]">
            Priradení členovia tímu
          </CardTitle>
          {canUpdateTasks && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white dark:bg-card border border-[rgba(0,0,0,0.1)] dark:border-border h-7 px-[10px] rounded-[8px]"
              onClick={() => {
                // TODO: Open dialog to add assignee
                toast({ title: "Info", description: "Funkcia pridania člena bude čoskoro dostupná" });
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="text-[12px] font-medium text-[#314158] dark:text-foreground">
                Pridať člena
              </span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingAssignees ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : assignees.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Žiadni priradení členovia
            </div>
          ) : (
            <div className="flex flex-col">
              {assignees.map((assignee, index) => {
                const user = assignee.user;
                const color = user ? getAvatarColor(user.name) : { bg: "bg-gray-100", text: "text-gray-600" };
                const hourlyRate = assignee.hourly_rate_cents ? (assignee.hourly_rate_cents / 100).toString() : "";
                
                return (
                  <div
                    key={assignee.id}
                    className={`border-b border-[#f1f5f9] dark:border-border px-6 py-4 flex items-center justify-between ${
                      index === assignees.length - 1 ? "" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className={`${color.bg} ${color.text} size-8`}>
                        <AvatarFallback className={`${color.bg} ${color.text} text-[12px] font-normal`}>
                          {user ? getInitials(user.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-[14px] font-medium text-[#0f172b] dark:text-foreground tracking-[-0.1504px]">
                          {user?.name || "Neznámy"}
                        </p>
                        <p className="text-[12px] text-[#62748e] dark:text-muted-foreground">
                          {user?.role || "Člen tímu"}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={hourlyRate}
                        onChange={(e) => {
                          const newRate = e.target.value;
                          // Update local state immediately
                          setAssignees(prev => prev.map(a => 
                            a.id === assignee.id 
                              ? { ...a, hourly_rate_cents: newRate ? Math.round(parseFloat(newRate) * 100) : null }
                              : a
                          ));
                        }}
                        onBlur={(e) => {
                          handleUpdateAssigneeRate(assignee.id, e.target.value);
                        }}
                        disabled={!canUpdateTasks || isLoading}
                        className="bg-[#f3f3f5] dark:bg-muted border-0 h-8 w-24 rounded-[8px] text-[14px] tracking-[-0.1504px] text-right pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#90a1b9] dark:text-muted-foreground">
                        €
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

