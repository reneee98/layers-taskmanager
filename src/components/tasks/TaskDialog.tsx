"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Task, Project } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusSelect } from "@/components/tasks/StatusSelect";
import { PrioritySelect } from "@/components/tasks/PrioritySelect";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  FolderKanban,
  Loader2,
  Palette,
  Plus,
  SlidersHorizontal,
  Sparkles,
  UserRoundPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useWorkspaceUsers } from "@/contexts/WorkspaceUsersContext";
import { TASK_COLOR_PALETTE, normalizeTaskColor } from "@/lib/task-colors";
import { resolveProjectColor } from "@/lib/project-colors";
import { cn } from "@/lib/utils";
import { ExchangeRateNotice } from "@/components/currency/ExchangeRateNotice";
import {
  SUPPORTED_CURRENCIES,
  getCurrencySymbol,
  getPerHourLabel,
  normalizeCurrency,
} from "@/lib/currency";

const TaskRichTextEditor = dynamic(
  () =>
    import("@/components/tasks/TaskRichTextEditor").then((module) => ({
      default: module.TaskRichTextEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 animate-pulse rounded-lg border border-border bg-muted/40" />
    ),
  }
);

interface TaskDialogProps {
  projectId?: string | null; // Optional - if null, task will be created without project
  task?: Task | null;
  initialDueDate?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode?: "default" | "quick";
  loadingTask?: boolean;
}

export function TaskDialog({
  projectId,
  task,
  initialDueDate = null,
  open,
  onOpenChange,
  onSuccess,
  mode = "default",
  loadingTask = false,
}: TaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("todo");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [taskColor, setTaskColor] = useState<string | null>(null);
  const [estimatedHours, setEstimatedHours] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showQuickDetails, setShowQuickDetails] = useState(true);
  const [panelTask, setPanelTask] = useState<Task | null>(null);
  const activeTask = panelTask || task || null;

  // Get workspace users from context
  const { users: contextUsers } = useWorkspaceUsers();
  const workspaceUsers = useMemo(() => {
    return contextUsers
      .filter((wu) => wu.profiles)
      .map((wu) => ({
        id: wu.profiles.id,
        display_name: wu.profiles.display_name,
        email: wu.profiles.email,
        role: wu.role,
      }));
  }, [contextUsers]);

  // Reset selectedProjectId when projectId prop changes
  useEffect(() => {
    if (open && !activeTask) {
      setSelectedProjectId(projectId || null);
    }
  }, [activeTask, projectId, open]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isBudgetAutoCalculated, setIsBudgetAutoCalculated] = useState(false);
  const [userSettings, setUserSettings] = useState<{ default_hourly_rate?: number | null } | null>(
    null
  );

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("medium");
    setTaskColor(null);
    setEstimatedHours("");
    setBudgetAmount("");
    setHourlyRate("");
    setCurrency("EUR");
    setDueDate(initialDueDate);
    setStartDate(initialDueDate);
    setSelectedProjectId(projectId || null);
    setSelectedAssignees([]);
    setIsBudgetAutoCalculated(false);
  }, [initialDueDate, projectId]);

  useEffect(() => {
    if (activeTask) {
      setTitle(activeTask.title);
      setDescription(activeTask.description || "");
      setStatus(activeTask.status);
      setPriority(activeTask.priority);
      setTaskColor(normalizeTaskColor(activeTask.color) || null);
      setEstimatedHours(activeTask.estimated_hours?.toString() || "");
      // Use task's budget_cents (individual budget for this task)
      setBudgetAmount(activeTask.budget_cents ? (activeTask.budget_cents / 100).toString() : "");
      setHourlyRate(
        activeTask.hourly_rate_cents ? (activeTask.hourly_rate_cents / 100).toString() : ""
      );
      setCurrency(normalizeCurrency(activeTask.currency));
      setDueDate(activeTask.due_date || null);
      setStartDate(activeTask.start_date || null);
      setSelectedProjectId(activeTask.project_id || null);
      if (activeTask.assignees !== undefined) {
        setSelectedAssignees(activeTask.assignees.map((assignee) => assignee.user_id));
      } else if (!panelTask) {
        setSelectedAssignees([]);
      }
      // Budget was loaded from task, not auto-calculated
      setIsBudgetAutoCalculated(false);
    } else {
      resetForm();
    }
  }, [activeTask, open, panelTask, resetForm]);

  useEffect(() => {
    if (!open) {
      setShowQuickDetails(true);
      setPanelTask(null);
      return;
    }

    if (task) setPanelTask(null);
  }, [open, task]);

  useEffect(() => {
    // Fetch projects and user settings when dialog is open (workspace users come from context)
    if (open) {
      const fetchProjects = async () => {
        try {
          const response = await fetch("/api/projects");
          const result = await response.json();
          if (result.success) {
            setProjects(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch projects:", error);
        }
      };

      const fetchUserSettings = async () => {
        try {
          const response = await fetch("/api/me/settings");
          const result = await response.json();
          if (result.success) {
            setUserSettings(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch user settings:", error);
        }
      };

      fetchProjects();
      fetchUserSettings();
    }
  }, [open]);

  // Auto-calculate budget when estimated_hours, project, or hourly rate changes
  useEffect(() => {
    if (estimatedHours && estimatedHours.trim() !== "") {
      const hours = parseFloat(estimatedHours);
      if (hours > 0 && !isNaN(hours)) {
        let hourlyRateValue: number | null = null;

        // Priority 1: Task hourly rate (for tasks without project)
        if (!selectedProjectId && hourlyRate && hourlyRate.trim() !== "") {
          hourlyRateValue = parseFloat(hourlyRate);
        }
        // Priority 2: Project hourly rate
        else if (selectedProjectId) {
          const project = projects.find((p) => p.id === selectedProjectId);
          if (project?.hourly_rate_cents) {
            hourlyRateValue = project.hourly_rate_cents / 100;
          }
        }
        // Priority 3: User default hourly rate (for tasks without project)
        else if (!selectedProjectId && userSettings?.default_hourly_rate != null) {
          hourlyRateValue = userSettings.default_hourly_rate;
        }

        if (hourlyRateValue && hourlyRateValue > 0) {
          const calculatedBudget = hours * hourlyRateValue;

          // Only auto-calculate if:
          // 1. It's a new task (no task), OR
          // 2. It's an existing task but budget was previously auto-calculated
          if (!activeTask || isBudgetAutoCalculated) {
            setBudgetAmount(calculatedBudget.toFixed(2));
            setIsBudgetAutoCalculated(true);
          }
        } else {
          if (isBudgetAutoCalculated) {
            setBudgetAmount("");
            setIsBudgetAutoCalculated(false);
          }
        }
      } else {
        if (isBudgetAutoCalculated) {
          setBudgetAmount("");
          setIsBudgetAutoCalculated(false);
        }
      }
    } else {
      // If estimated hours is cleared, clear budget if it was auto-calculated
      if (isBudgetAutoCalculated) {
        setBudgetAmount("");
        setIsBudgetAutoCalculated(false);
      }
    }
  }, [
    estimatedHours,
    selectedProjectId,
    projects,
    hourlyRate,
    userSettings,
    activeTask,
    isBudgetAutoCalculated,
  ]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleAssigneeToggle = (userId: string) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter((id) => id !== userId));
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };

  const handleRemoveAssignee = (userId: string) => {
    setSelectedAssignees(selectedAssignees.filter((id) => id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        due_date: dueDate || null,
        start_date: startDate || null,
      };

      if (taskColor) {
        payload.color = taskColor;
      } else if (activeTask?.color) {
        payload.color = null;
      }

      // Include project_id only if a project is selected
      if (selectedProjectId) {
        payload.project_id = selectedProjectId;
      } else {
        payload.project_id = null;
      }

      payload.currency = currency;

      // Only include estimated_hours if it has a value
      if (estimatedHours && estimatedHours.trim() !== "") {
        payload.estimated_hours = parseFloat(estimatedHours);
      }

      // Only include budget_cents if it was manually set (not auto-calculated)
      // If budget was auto-calculated, don't send it - let API calculate it from estimated_hours
      if (budgetAmount && budgetAmount.trim() !== "" && !isBudgetAutoCalculated) {
        const budgetValue = parseFloat(budgetAmount);
        payload.budget_cents = Math.round(budgetValue * 100);
      }
      // If budget was auto-calculated, don't send budget_cents - API will calculate it automatically

      // Include hourly_rate_cents only for tasks without project
      if (!selectedProjectId && hourlyRate && hourlyRate.trim() !== "") {
        const hourlyRateValue = parseFloat(hourlyRate);
        payload.hourly_rate_cents = Math.round(hourlyRateValue * 100);
      }

      const isCreating = !activeTask;
      const method = isCreating ? "POST" : "PATCH";
      const url = isCreating ? "/api/tasks" : `/api/tasks/${activeTask.id}`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        const savedTask = result.data as Task;

        const shouldSyncAssignees =
          isCreating || mode === "quick" || activeTask?.assignees !== undefined;

        // Keep assignees in sync when the current form has complete assignee data.
        if (savedTask?.id && shouldSyncAssignees) {
          try {
            const assigneeResponse = await fetch(`/api/tasks/${savedTask.id}/assignees`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ assigneeIds: selectedAssignees }),
            });

            const assigneeResult = await assigneeResponse.json();
            if (!assigneeResult.success) {
              console.error("Failed to assign users to task:", assigneeResult.error);
            }
          } catch (assigneeError) {
            console.error("Error assigning users to task:", assigneeError);
            // Don't fail the entire operation if assignment fails
          }
        }

        toast({
          title: "Úspech",
          description: isCreating ? "Úloha bola vytvorená" : "Úloha bola aktualizovaná",
        });
        onSuccess();

        if (mode === "quick") {
          try {
            const detailResponse = await fetch(`/api/tasks/${savedTask.id}`, { cache: "no-store" });
            const detailResult = await detailResponse.json();
            setPanelTask(detailResult.success ? detailResult.data : savedTask);
          } catch (detailError) {
            console.error("Failed to refresh task detail:", detailError);
            setPanelTask(savedTask);
          }
          setShowQuickDetails(true);
          return;
        }

        onOpenChange(false);
        resetForm();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa uložiť úlohu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isSidePanel = mode === "quick";
  const isQuickCreate = isSidePanel && !activeTask;
  const taskDetailHref = activeTask
    ? activeTask.project?.id || activeTask.project_id
      ? `/projects/${activeTask.project?.id || activeTask.project_id}/tasks/${activeTask.id}`
      : `/tasks/${activeTask.id}`
    : null;

  const projectField = (
    <div className="space-y-2">
      <Label htmlFor="project" className="text-xs font-semibold text-foreground">
        Projekt
      </Label>
      <Select
        value={selectedProjectId || "none"}
        onValueChange={(value) => setSelectedProjectId(value === "none" ? null : value)}
      >
        <SelectTrigger id="project" className="h-11 bg-card">
          <SelectValue placeholder="Vybrať projekt" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Bez projektu</span>
          </SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full opacity-70"
                  style={{ backgroundColor: resolveProjectColor(project) || undefined }}
                />
                <span className="truncate font-medium">{project.name}</span>
                {project.code && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {project.code}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const dateField = (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-foreground">Termín</Label>
      <DateRangePicker
        startDate={startDate}
        endDate={dueDate}
        onSave={async (start, end) => {
          setStartDate(start);
          setDueDate(end);
        }}
        placeholder="Nastaviť termín"
        className="h-11 w-full justify-start bg-card text-sm"
      />
    </div>
  );

  const assigneeField =
    !activeTask || activeTask.assignees !== undefined || isSidePanel ? (
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-foreground">Riešitelia</Label>
        {selectedAssignees.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedAssignees.map((userId) => {
              const user = workspaceUsers.find((workspaceUser) => workspaceUser.id === userId);
              if (!user) return null;

              return (
                <Badge
                  key={userId}
                  variant="secondary"
                  className="h-7 gap-1.5 rounded-lg border border-border/70 bg-muted/50 pl-1.5 pr-1"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[9px]">
                      {getInitials(user.display_name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-40 truncate text-xs">
                    {user.display_name || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignee(userId)}
                    className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    aria-label={`Odobrať ${user.display_name || user.email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
        <Select
          value=""
          onValueChange={(value) => {
            if (value && !selectedAssignees.includes(value)) handleAssigneeToggle(value);
          }}
        >
          <SelectTrigger className="h-11 bg-card">
            <div className="flex min-w-0 items-center gap-2">
              <UserRoundPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Pridať riešiteľa" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {workspaceUsers
              .filter((user) => !selectedAssignees.includes(user.id))
              .map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.display_name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.display_name || user.email}</span>
                    {user.role && (
                      <Badge variant="outline" className="text-[10px]">
                        {user.role}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    ) : null;

  const statusAndPriorityFields = (
    <div className="grid grid-cols-2 gap-3">
      <div className="min-w-0 space-y-1.5">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Status
        </Label>
        <StatusSelect
          status={status}
          size="dashboard"
          onStatusChange={(value) => setStatus(value as Task["status"])}
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Priorita
        </Label>
        <PrioritySelect
          priority={priority}
          size="dashboard"
          onPriorityChange={(value) => setPriority(value as Task["priority"])}
        />
      </div>
    </div>
  );

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const inheritedProjectColor = resolveProjectColor(selectedProject);

  const colorField = (
    <div className="space-y-2.5">
      <Label htmlFor="taskColor" className="text-xs font-semibold text-foreground">
        Farebné zvýraznenie
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTaskColor(null)}
          aria-label="Použiť farbu projektu"
          aria-pressed={!taskColor}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card px-2 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            !taskColor && "border-foreground/25 bg-muted text-foreground"
          )}
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full border border-black/5 bg-muted-foreground/40"
            style={{ backgroundColor: inheritedProjectColor || undefined }}
          />
          Projekt
        </button>
        {TASK_COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setTaskColor(color)}
            className={cn(
              "h-7 w-7 rounded-full border border-black/5 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              taskColor === color && "ring-2 ring-foreground/40 ring-offset-2"
            )}
            style={{ backgroundColor: color }}
            aria-label={`Vybrať farbu ${color}`}
            aria-pressed={taskColor === color}
          />
        ))}
        <label
          className="relative flex h-7 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
          title="Vlastná farba"
        >
          <Palette className="h-3.5 w-3.5" />
          <input
            id="taskColor"
            type="color"
            value={taskColor || TASK_COLOR_PALETTE[0]}
            onChange={(event) => setTaskColor(normalizeTaskColor(event.target.value))}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Vlastná farba úlohy"
          />
        </label>
      </div>
      <p className="text-[11px] leading-4 text-muted-foreground">
        Bez vlastnej farby úloha automaticky použije farbu svojho projektu.
      </p>
    </div>
  );

  const financeFields = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="estimatedHours" className="text-xs font-semibold text-foreground">
            Odhad hodín
          </Label>
          <Input
            id="estimatedHours"
            type="number"
            step="0.25"
            min="0"
            value={estimatedHours}
            onChange={(event) => setEstimatedHours(event.target.value)}
            placeholder="0"
            className="h-11 bg-card"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency" className="text-xs font-semibold text-foreground">
            Mena
          </Label>
          <Select value={currency} onValueChange={(value) => setCurrency(value as "EUR" | "USD")}>
            <SelectTrigger id="currency" className="h-11 bg-card">
              <SelectValue placeholder="Vybrať menu" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((supportedCurrency) => (
                <SelectItem key={supportedCurrency} value={supportedCurrency}>
                  {supportedCurrency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={cn("grid gap-4", !selectedProjectId && "sm:grid-cols-2")}>
        {!selectedProjectId && (
          <div className="space-y-2">
            <Label htmlFor="hourlyRate" className="text-xs font-semibold text-foreground">
              Hodinová sadzba {getPerHourLabel(currency)}
            </Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              min="0"
              value={hourlyRate}
              onChange={(event) => setHourlyRate(event.target.value)}
              placeholder="0,00"
              className="h-11 bg-card"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="budgetAmount" className="text-xs font-semibold text-foreground">
            Rozpočet {getCurrencySymbol(currency)}
          </Label>
          <Input
            id="budgetAmount"
            type="number"
            step="0.01"
            min="0"
            value={budgetAmount}
            onChange={(event) => {
              setBudgetAmount(event.target.value);
              setIsBudgetAutoCalculated(false);
            }}
            placeholder="0,00"
            className="h-11 bg-card"
          />
          <p className="text-[11px] leading-4 text-muted-foreground">
            {isBudgetAutoCalculated
              ? "Vypočítané automaticky z odhadu hodín."
              : "Nechajte prázdne pre automatický výpočet."}
          </p>
        </div>
      </div>
      <ExchangeRateNotice currency={currency} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        placement={isSidePanel ? "right" : "center"}
        className={cn(
          "max-h-[calc(100dvh-1.5rem)] gap-0 overflow-hidden rounded-[20px] border-border/80 bg-card p-0 shadow-[0_28px_90px_-24px_rgba(15,23,42,0.45)]",
          isSidePanel
            ? "max-h-none grid-rows-[auto_minmax(0,1fr)] rounded-none sm:rounded-l-[20px]"
            : "sm:max-w-[760px]"
        )}
      >
        <DialogHeader className="border-b border-border/70 bg-muted/20 px-5 py-5 pr-14 text-left sm:px-6">
          <div className="flex items-start gap-3.5">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                isSidePanel
                  ? "border-brand/15 bg-brand/10 text-brand"
                  : "border-border bg-card text-foreground"
              )}
            >
              {isQuickCreate ? (
                <Sparkles className="h-4.5 w-4.5" />
              ) : (
                <ClipboardList className="h-4.5 w-4.5" />
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <DialogTitle className="text-xl font-semibold tracking-[-0.025em]">
                {loadingTask
                  ? "Načítavam úlohu"
                  : isQuickCreate
                    ? "Rýchla úloha"
                    : isSidePanel
                      ? "Detail úlohy"
                      : activeTask
                        ? "Upraviť úlohu"
                        : "Nová úloha"}
              </DialogTitle>
              <DialogDescription className="mt-1 leading-5">
                {loadingTask
                  ? "Načítavam aktuálne údaje a nastavenia."
                  : isQuickCreate
                    ? "Zapíšte, čo treba spraviť. Detaily môžete doplniť aj neskôr."
                    : activeTask
                      ? "Upravujte zadanie priamo bez odchodu z dashboardu."
                      : "Jasné zadanie, zodpovednosť a termín na jednom mieste."}
              </DialogDescription>
              {isSidePanel && taskDetailHref && !loadingTask && (
                <Link
                  href={taskDetailHref}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Otvoriť celý detail
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col"
          aria-busy={isLoading || loadingTask}
        >
          {loadingTask ? (
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-5 py-6 sm:px-6">
              <div className="h-28 animate-pulse rounded-xl border border-border/70 bg-muted/50" />
              <div className="h-44 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
              <div className="h-36 animate-pulse rounded-xl border border-border/70 bg-muted/30" />
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className={cn("space-y-5 px-5 py-5 sm:px-6", !isQuickCreate && "sm:py-6")}>
                  <section
                    className={cn(
                      !isQuickCreate &&
                        !isSidePanel &&
                        "rounded-xl border border-border/80 bg-card p-4 sm:p-5"
                    )}
                  >
                    {!isQuickCreate && !isSidePanel && (
                      <div className="mb-4 flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <FolderKanban className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold">Základné informácie</h3>
                          <p className="text-[11px] text-muted-foreground">
                            Čo treba spraviť a kam úloha patrí.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-semibold text-foreground">
                          Názov úlohy <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          placeholder={
                            isQuickCreate
                              ? "Čo treba spraviť?"
                              : "Napr. Pripraviť návrh úvodnej stránky"
                          }
                          required
                          autoFocus
                          className={cn(
                            "h-11 bg-card placeholder:text-muted-foreground/75",
                            isQuickCreate && "h-12 text-base font-medium"
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground">
                          Popis{" "}
                          <span className="font-normal text-muted-foreground">(voliteľné)</span>
                        </Label>
                        <TaskRichTextEditor
                          value={description}
                          onChange={setDescription}
                          placeholder="Doplňte kontext, podklady alebo očakávaný výsledok…"
                          compact={isQuickCreate}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {projectField}
                        {isQuickCreate && dateField}
                      </div>

                      {isQuickCreate && statusAndPriorityFields}
                      {isQuickCreate && assigneeField}
                    </div>
                  </section>

                  {isQuickCreate ? (
                    <section className="border-t border-border/70 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowQuickDetails((current) => !current)}
                        className="flex w-full items-center gap-3 rounded-lg px-1 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                        aria-expanded={showQuickDetails}
                        aria-controls="quick-task-details"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">Ďalšie nastavenia</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            Farba, odhad a rozpočet
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            showQuickDetails && "rotate-180"
                          )}
                        />
                      </button>

                      {showQuickDetails && (
                        <div
                          id="quick-task-details"
                          className="space-y-5 border-t border-border/70 py-5"
                        >
                          {colorField}
                          <div className="border-t border-border/70 pt-5">{financeFields}</div>
                        </div>
                      )}
                    </section>
                  ) : (
                    <>
                      <section
                        className={cn(
                          isSidePanel
                            ? "border-t border-border/70 pt-5"
                            : "rounded-xl border border-border/80 bg-card p-4 sm:p-5"
                        )}
                      >
                        <div className="mb-4 flex items-center gap-2.5">
                          {!isSidePanel && (
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <div>
                            <h3 className="text-sm font-semibold">Plánovanie</h3>
                            <p className="text-[11px] text-muted-foreground">
                              Termín, stav a zodpovední ľudia.
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {statusAndPriorityFields}
                          <div className="grid gap-4 sm:grid-cols-2">
                            {dateField}
                            {assigneeField}
                          </div>
                          <div className="border-t border-border/70 pt-4">{colorField}</div>
                        </div>
                      </section>

                      <section
                        className={cn(
                          isSidePanel
                            ? "border-t border-border/70 pt-5"
                            : "rounded-xl border border-border/80 bg-card p-4 sm:p-5"
                        )}
                      >
                        <div className="mb-4 flex items-center gap-2.5">
                          {!isSidePanel && (
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <CircleDollarSign className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <div>
                            <h3 className="text-sm font-semibold">Čas a rozpočet</h3>
                            <p className="text-[11px] text-muted-foreground">
                              Voliteľný odhad pre plánovanie a fakturáciu.
                            </p>
                          </div>
                        </div>
                        {financeFields}
                      </section>
                    </>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 border-t border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="sm:mr-auto"
                >
                  {isSidePanel ? "Zavrieť" : "Zrušiť"}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !title.trim()}
                  className={cn(
                    "min-w-36",
                    isSidePanel && "bg-brand text-brand-foreground hover:bg-brand/90"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Ukladám…
                    </>
                  ) : activeTask ? (
                    "Uložiť zmeny"
                  ) : (
                    <>
                      <Plus />
                      {isQuickCreate ? "Pridať úlohu" : "Vytvoriť úlohu"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
