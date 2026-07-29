"use client";

import { useState } from "react";
import { ArrowRight, Banknote, Clock3, Loader2, Play, Plus, Square, X } from "lucide-react";
import Link from "next/link";

import { PrioritySelect, type TaskPriority } from "@/components/tasks/PrioritySelect";
import { StatusSelect } from "@/components/tasks/StatusSelect";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceUsers } from "@/contexts/WorkspaceUsersContext";
import { useTimer } from "@/contexts/TimerContext";
import { normalizeCurrency } from "@/lib/currency";
import { formatCurrency, formatHours } from "@/lib/format";
import { cn, stripHtml } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { projectColorToRgba, resolveProjectColor } from "@/lib/project-colors";

export interface DashboardTaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  budget_cents: number | null;
  currency?: string | null;
  project_id: string | null;
  assignees?: Array<{
    id: string;
    user_id: string;
    user?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  project: {
    id: string;
    name: string;
    code: string;
    color?: string | null;
    currency?: string | null;
    client?: {
      id?: string;
      name: string;
    };
  } | null;
}

export interface DashboardTaskUpdate {
  status?: string;
  priority?: string;
  start_date?: string | null;
  due_date?: string | null;
}

interface DashboardTaskRowProps {
  task: DashboardTaskItem;
  canUpdate: boolean;
  canViewPrices?: boolean;
  showProject?: boolean;
  onUpdate: (taskId: string, updates: DashboardTaskUpdate) => Promise<void>;
  onTimeTracked?: (taskId: string, hours: number) => void;
}

interface DashboardDateRangeControlProps {
  startDate: string | null;
  dueDate: string | null;
  disabled: boolean;
  taskTitle: string;
  muted?: boolean;
  onChange: (startDate: string | null, dueDate: string | null) => Promise<void>;
}

const taskSurfaceClasses: Record<string, string> = {
  in_progress: "bg-sky-500/[0.025] hover:bg-sky-500/[0.055]",
  review: "bg-amber-500/[0.025] hover:bg-amber-500/[0.055]",
  sent_to_client: "bg-violet-500/[0.025] hover:bg-violet-500/[0.055]",
  done: "bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05]",
};

const getTaskHref = (task: DashboardTaskItem) => {
  if (task.project?.id) {
    return `/projects/${task.project.id}/tasks/${task.id}`;
  }

  return `/tasks/${task.id}`;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatTimerDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const getElapsedSeconds = (startedAt: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));

interface DashboardAssigneeControlProps {
  task: DashboardTaskItem;
  disabled: boolean;
}

const DashboardAssigneeControl = ({ task, disabled }: DashboardAssigneeControlProps) => {
  const { users: workspaceUsers } = useWorkspaceUsers();
  const [isSaving, setIsSaving] = useState(false);

  const assignees = task.assignees || [];
  const assigneeIds = assignees.map((assignee) => assignee.user_id);

  const availableUsers = workspaceUsers
    .filter((workspaceUser: any) => workspaceUser.profiles)
    .map((workspaceUser: any) => workspaceUser.profiles)
    .filter((profile: any) => profile?.id && !assigneeIds.includes(profile.id));

  const saveAssignees = async (nextAssigneeIds: string[], successMessage: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/assignees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeIds: nextAssigneeIds }),
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Nepodarilo sa upraviť priradenie");
      }

      // Refresh dashboard task lists without a full page reload
      window.dispatchEvent(new CustomEvent("taskStatusChanged"));
      toast({ title: "Úspech", description: successMessage });
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa upraviť priradenie",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getAssigneeName = (assignee: { user?: { name?: string; email?: string } | null }) =>
    assignee.user?.name || assignee.user?.email || "Používateľ";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled || isSaving}
          aria-label={`Upraviť priradených používateľov úlohy ${stripHtml(task.title)}`}
          title="Priradiť používateľov"
          className="group/assignees inline-flex h-11 shrink-0 items-center justify-center gap-0.5 rounded-md px-1 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:h-8"
        >
          {assignees.length > 0 ? (
            <span className="flex -space-x-1.5">
              {assignees.slice(0, 2).map((assignee) => (
                <Avatar key={assignee.id} className="h-6 w-6 border border-card">
                  <AvatarFallback className="bg-muted text-[8px] font-medium text-muted-foreground">
                    {getInitials(getAssigneeName(assignee))}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > 2 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-card bg-muted text-[8px] font-medium text-muted-foreground">
                  +{assignees.length - 2}
                </span>
              )}
            </span>
          ) : null}
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors group-hover/assignees:border-solid group-hover/assignees:text-foreground",
                assignees.length === 0 && "h-6 w-6"
              )}
            >
              <Plus className="h-3 w-3" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {assignees.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Priradení
            </DropdownMenuLabel>
            {assignees.map((assignee) => {
              const name = getAssigneeName(assignee);
              return (
                <DropdownMenuItem
                  key={assignee.id}
                  onClick={() =>
                    saveAssignees(
                      assigneeIds.filter((id) => id !== assignee.user_id),
                      `${name} bol odstránený z úlohy`
                    )
                  }
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px]">{getInitials(name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Pridať</DropdownMenuLabel>
        {availableUsers.length === 0 ? (
          <DropdownMenuItem disabled>Všetci používatelia sú už priradení</DropdownMenuItem>
        ) : (
          availableUsers.map((profile: any) => {
            const name = profile.display_name || profile.email || "Neznámy";
            return (
              <DropdownMenuItem
                key={profile.id}
                onClick={() =>
                  saveAssignees([...assigneeIds, profile.id], `${name} bol priradený k úlohe`)
                }
                className="flex items-center gap-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px]">{getInitials(name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const DashboardDateRangeControl = ({
  startDate,
  dueDate,
  disabled,
  taskTitle,
  muted = false,
  onChange,
}: DashboardDateRangeControlProps) => {
  return (
    <div
      title={
        startDate || dueDate
          ? `Termín úlohy ${taskTitle}: ${startDate || "?"} – ${dueDate || "?"}`
          : `Nastaviť termín od – do pre úlohu ${taskTitle}`
      }
    >
      <DateRangePicker
        startDate={startDate}
        endDate={dueDate}
        disabled={disabled}
        placeholder="Termín"
        className={cn(
          "h-11 w-[112px] justify-center rounded-md border-transparent bg-muted/55 px-2 shadow-none sm:h-8",
          muted && "opacity-70"
        )}
        onSave={async (nextStartDate, nextDueDate) => {
          const normalizedDueDate = nextDueDate || nextStartDate;
          await onChange(nextStartDate, normalizedDueDate);
        }}
      />
    </div>
  );
};

export const DashboardTaskRow = ({
  task,
  canUpdate,
  canViewPrices = false,
  showProject = true,
  onUpdate,
  onTimeTracked,
}: DashboardTaskRowProps) => {
  const { activeTimer, currentDuration, startTimer, stopTimer } = useTimer();
  const [isTimerUpdating, setIsTimerUpdating] = useState(false);

  const taskTitle = stripHtml(task.title);
  const taskHref = getTaskHref(task);
  const isTimerActive = activeTimer?.task_id === task.id;
  const liveHours = isTimerActive ? currentDuration / 3600 : 0;
  const actualHours = Math.max(task.actual_hours || 0, 0) + liveHours;
  const estimatedHours = Math.max(task.estimated_hours || 0, 0);
  const remainingHours = Math.max(estimatedHours - actualHours, 0);
  const exceededHours = Math.max(actualHours - estimatedHours, 0);
  const budgetAmount = Math.max(task.budget_cents || 0, 0) / 100;
  const hasVisibleBudget = canViewPrices && budgetAmount > 0;
  const taskCurrency = normalizeCurrency(task.currency || task.project?.currency);
  const projectColor = resolveProjectColor(task.project);
  const timeProgress = estimatedHours > 0 ? Math.min((actualHours / estimatedHours) * 100, 100) : 0;
  const timeStatusLabel =
    estimatedHours === 0
      ? "bez odhadu"
      : exceededHours > 0
        ? `+${formatHours(exceededHours)} nad odhad`
        : `ostáva ${formatHours(remainingHours)}`;

  const handleTimerToggle = async () => {
    if (isTimerUpdating) return;

    setIsTimerUpdating(true);
    try {
      if (isTimerActive && activeTimer) {
        const elapsedSeconds = getElapsedSeconds(activeTimer.started_at);
        await stopTimer();
        if (elapsedSeconds > 0) {
          onTimeTracked?.(task.id, elapsedSeconds / 3600);
        }
        toast({
          title: "Časovač zastavený",
          description: `Zapísaných ${formatTimerDuration(elapsedSeconds)} do úlohy „${taskTitle}“.`,
        });
        return;
      }

      if (activeTimer) {
        const previousElapsedSeconds = getElapsedSeconds(activeTimer.started_at);
        const previousTaskId = activeTimer.task_id;
        await stopTimer();
        if (previousElapsedSeconds > 0) {
          onTimeTracked?.(previousTaskId, previousElapsedSeconds / 3600);
        }
      }

      await startTimer(
        task.id,
        taskTitle,
        task.project?.id || task.project_id || "",
        task.project?.name || "Bez projektu"
      );
      toast({
        title: "Časovač spustený",
        description: `Sleduje sa čas na úlohe „${taskTitle}“.`,
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Časovač sa nepodarilo aktualizovať",
        variant: "destructive",
      });
    } finally {
      setIsTimerUpdating(false);
    }
  };

  return (
    <div
      style={
        projectColor
          ? {
              backgroundImage: `linear-gradient(90deg, ${projectColorToRgba(
                projectColor,
                0.025
              )} 0, transparent 210px)`,
            }
          : undefined
      }
      className={cn(
        "group relative flex min-h-[60px] flex-col gap-2 border-b border-border/60 px-3 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-muted/35 sm:px-4 lg:flex-row lg:items-center lg:gap-3",
        taskSurfaceClasses[task.status],
        isTimerActive && "bg-emerald-500/[0.055] hover:bg-emerald-500/[0.08]"
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-0.5 rounded-r-full opacity-80"
        style={{
          backgroundColor: isTimerActive
            ? "#10B981"
            : projectColor
              ? projectColorToRgba(projectColor, 0.45)
              : undefined,
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <PrioritySelect
            priority={task.priority as TaskPriority}
            disabled={!canUpdate}
            size="flag"
            onPriorityChange={(priority) => onUpdate(task.id, { priority })}
          />
          <Link
            href={taskHref}
            className="min-w-0 flex-1 truncate text-[13px] font-medium leading-5 text-foreground outline-none transition-colors hover:text-foreground/70 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {taskTitle}
          </Link>
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-4 text-muted-foreground">
          {showProject && task.project && (
            <span
              className="max-w-48 truncate rounded px-1.5 py-px font-medium text-foreground"
              style={
                projectColor
                  ? {
                      backgroundColor: projectColorToRgba(projectColor, 0.045),
                    }
                  : undefined
              }
            >
              {task.project.name}
              {task.project.code ? ` · ${task.project.code}` : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1 lg:hidden">
            <Clock3 className="h-3 w-3" />
            <span
              className={cn("font-medium text-foreground", exceededHours > 0 && "text-destructive")}
            >
              {timeStatusLabel}
            </span>
          </span>
          {hasVisibleBudget && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 lg:hidden">
              <Banknote className="h-3 w-3" />
              <span className="font-semibold tabular-nums">
                {formatCurrency(budgetAmount, taskCurrency)}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 lg:grid lg:flex-none lg:grid-cols-[160px_112px_128px_76px_32px_32px] lg:gap-2">
        <StatusSelect
          status={
            task.status as
              | "todo"
              | "in_progress"
              | "review"
              | "sent_to_client"
              | "done"
              | "cancelled"
          }
          onStatusChange={(status) => onUpdate(task.id, { status })}
          disabled={!canUpdate}
          size="dashboard"
        />

        <DashboardDateRangeControl
          startDate={task.start_date}
          dueDate={task.due_date}
          disabled={!canUpdate}
          taskTitle={taskTitle}
          muted={task.status === "done" || task.status === "cancelled"}
          onChange={(startDate, dueDate) =>
            onUpdate(task.id, { start_date: startDate, due_date: dueDate })
          }
        />

        <div
          className="hidden w-32 shrink-0 flex-col gap-0.5 lg:flex"
          title={`${timeStatusLabel}${
            hasVisibleBudget ? `, cena úlohy ${formatCurrency(budgetAmount, taskCurrency)}` : ""
          }`}
        >
          <div className="flex items-center gap-1 whitespace-nowrap text-[10px]">
            <Clock3
              className={cn(
                "h-3 w-3 shrink-0",
                isTimerActive ? "text-emerald-500" : "text-muted-foreground"
              )}
            />
            <span
              className={cn(
                "font-semibold tabular-nums text-foreground",
                exceededHours > 0 && "text-destructive"
              )}
            >
              {estimatedHours > 0
                ? exceededHours > 0
                  ? `+${formatHours(exceededHours)}`
                  : formatHours(remainingHours)
                : "bez odhadu"}
            </span>
            {estimatedHours > 0 && (
              <span className="text-muted-foreground">
                {exceededHours > 0 ? "nad odhad" : "ostáva"}
              </span>
            )}
          </div>
          {hasVisibleBudget ? (
            <div className="flex items-center gap-1 whitespace-nowrap text-[9px] text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-3 w-3 shrink-0" />
              <span className="font-semibold tabular-nums">
                {formatCurrency(budgetAmount, taskCurrency)}
              </span>
              <span className="text-muted-foreground">za úlohu</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {estimatedHours > 0 && (
                <div
                  role="progressbar"
                  aria-label={`Časový progres úlohy ${taskTitle}`}
                  aria-valuemin={0}
                  aria-valuemax={estimatedHours}
                  aria-valuenow={actualHours}
                  className="h-0.5 min-w-8 flex-1 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      exceededHours > 0
                        ? "bg-destructive"
                        : timeProgress >= 80
                          ? "bg-orange-500"
                          : isTimerActive
                            ? "bg-emerald-500"
                            : "bg-foreground/60"
                    )}
                    style={{ width: `${timeProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 justify-center"
          role="group"
          aria-label={
            task.assignees && task.assignees.length > 0
              ? "Priradení používatelia"
              : "Bez priradeného používateľa"
          }
        >
          <DashboardAssigneeControl task={task} disabled={!canUpdate} />
        </div>

        <button
          type="button"
          onClick={handleTimerToggle}
          disabled={isTimerUpdating}
          aria-label={
            isTimerActive
              ? `Zastaviť časovač úlohy ${taskTitle}`
              : `Spustiť časovač úlohy ${taskTitle}`
          }
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-transparent bg-emerald-500/[0.07] text-emerald-600 outline-none transition-colors hover:bg-emerald-500/[0.13] focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8 dark:text-emerald-400",
            isTimerActive && "bg-emerald-500/[0.14] text-emerald-700 dark:text-emerald-300"
          )}
        >
          {isTimerUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isTimerActive ? (
            <Square className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>

        <Link
          href={taskHref}
          aria-label={`Otvoriť úlohu ${taskTitle}`}
          className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:flex"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};
