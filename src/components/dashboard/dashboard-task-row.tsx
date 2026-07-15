"use client";

import { useState } from "react";
import { format, isToday, parseISO, startOfDay } from "date-fns";
import { sk } from "date-fns/locale";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Circle,
  Clock3,
  Loader2,
  Play,
  Square,
} from "lucide-react";
import Link from "next/link";

import { StatusSelect } from "@/components/tasks/StatusSelect";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTimer } from "@/contexts/TimerContext";
import { formatHours } from "@/lib/format";
import { cn, stripHtml } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export interface DashboardTaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
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
    client?: {
      id?: string;
      name: string;
    };
  } | null;
}

export interface DashboardTaskUpdate {
  status?: string;
  priority?: string;
  due_date?: string | null;
}

interface DashboardTaskRowProps {
  task: DashboardTaskItem;
  canUpdate: boolean;
  showProject?: boolean;
  onUpdate: (taskId: string, updates: DashboardTaskUpdate) => Promise<void>;
  onTimeTracked?: (taskId: string, hours: number) => void;
}

interface DashboardDueDateControlProps {
  dueDate: string | null;
  disabled: boolean;
  taskTitle: string;
  onChange: (dueDate: string | null) => Promise<void>;
}

const priorityLabels: Record<string, string> = {
  low: "Nízka",
  medium: "Stredná",
  high: "Vysoká",
  urgent: "Urgentná",
};

const priorityToneClasses: Record<string, string> = {
  low: "text-slate-500 dark:text-slate-400",
  medium: "text-sky-600 dark:text-sky-400",
  high: "text-orange-600 dark:text-orange-400",
  urgent: "text-rose-600 dark:text-rose-400",
};

const taskAccentClasses: Record<string, string> = {
  todo: "bg-slate-300 dark:bg-slate-600",
  in_progress: "bg-sky-400 dark:bg-sky-500",
  review: "bg-amber-400 dark:bg-amber-500",
  sent_to_client: "bg-violet-400 dark:bg-violet-500",
  done: "bg-emerald-400 dark:bg-emerald-500",
  cancelled: "bg-rose-400 dark:bg-rose-500",
};

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

const getDeadline = (dueDate: string | null) => {
  if (!dueDate) {
    return null;
  }

  const date = parseISO(dueDate);
  const today = startOfDay(new Date());
  const dueDay = startOfDay(date);
  const days = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) {
    return { label: `${Math.abs(days)} d po termíne`, urgent: true };
  }

  if (isToday(date)) {
    return { label: "Dnes", urgent: true };
  }

  if (days === 1) {
    return { label: "Zajtra", urgent: false };
  }

  return {
    label: format(date, days <= 7 ? "EEE d. MMM" : "d. MMM", { locale: sk }),
    urgent: false,
  };
};

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

const DashboardDueDateControl = ({
  dueDate,
  disabled,
  taskTitle,
  onChange,
}: DashboardDueDateControlProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const deadline = getDeadline(dueDate);
  const selectedDate = dueDate ? parseISO(dueDate) : undefined;

  const handleChange = async (date: Date | undefined) => {
    const nextDueDate = date ? format(date, "yyyy-MM-dd") : null;
    if (nextDueDate === dueDate) return;

    setIsSaving(true);
    try {
      await onChange(nextDueDate);
    } finally {
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || isSaving}
          aria-label={
            dueDate ? `Zmeniť termín úlohy ${taskTitle}` : `Nastaviť termín úlohy ${taskTitle}`
          }
          className={cn(
            "inline-flex h-11 w-[72px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent bg-muted/55 px-2 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:h-8",
            deadline?.urgent &&
              "bg-rose-500/[0.08] text-rose-600 hover:bg-rose-500/[0.13] dark:text-rose-400"
          )}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : deadline?.urgent ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : (
            <CalendarDays className="h-3.5 w-3.5" />
          )}
          <span>{dueDate ? format(parseISO(dueDate), "d.M.") : "Termín"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={handleChange}
          initialFocus
          disabled={(date) => date < new Date("1900-01-01")}
        />
        {dueDate && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => handleChange(undefined)}
            >
              Odstrániť termín
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export const DashboardTaskRow = ({
  task,
  canUpdate,
  showProject = true,
  onUpdate,
  onTimeTracked,
}: DashboardTaskRowProps) => {
  const { activeTimer, currentDuration, startTimer, stopTimer } = useTimer();
  const [isTimerUpdating, setIsTimerUpdating] = useState(false);

  const taskTitle = stripHtml(task.title);
  const taskHref = getTaskHref(task);
  const priorityLabel = priorityLabels[task.priority] || task.priority;
  const isTimerActive = activeTimer?.task_id === task.id;
  const liveHours = isTimerActive ? currentDuration / 3600 : 0;
  const actualHours = Math.max(task.actual_hours || 0, 0) + liveHours;
  const estimatedHours = Math.max(task.estimated_hours || 0, 0);
  const remainingHours = Math.max(estimatedHours - actualHours, 0);
  const exceededHours = Math.max(actualHours - estimatedHours, 0);
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
      className={cn(
        "group relative flex min-h-[52px] flex-col gap-2 border-b border-border/60 px-3 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-muted/35 sm:px-4 lg:flex-row lg:items-center lg:gap-3 lg:py-2",
        taskSurfaceClasses[task.status],
        isTimerActive && "bg-emerald-500/[0.055] hover:bg-emerald-500/[0.08]"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-2 left-0 w-0.5 rounded-r-full opacity-70",
          taskAccentClasses[task.status] || taskAccentClasses.todo,
          isTimerActive && "bg-emerald-500 opacity-100"
        )}
      />
      <div className="min-w-0 flex-1">
        <Link
          href={taskHref}
          className="block truncate text-[13px] font-medium leading-5 text-foreground outline-none transition-colors hover:text-foreground/70 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {taskTitle}
        </Link>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-4 text-muted-foreground">
          {showProject && task.project && (
            <span className="max-w-48 truncate">
              {task.project.name}
              {task.project.code ? ` · ${task.project.code}` : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Circle
              className={cn(
                "h-1.5 w-1.5 fill-current",
                priorityToneClasses[task.priority] || "text-muted-foreground/70"
              )}
            />
            <span className={priorityToneClasses[task.priority]}>{priorityLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1 lg:hidden">
            <Clock3 className="h-3 w-3" />
            <span className="font-medium text-foreground">{formatHours(actualHours)}</span>
            {estimatedHours > 0 && <span>/ {formatHours(estimatedHours)}</span>}
            <span>· {timeStatusLabel}</span>
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 lg:grid lg:flex-none lg:grid-cols-[144px_72px_128px_56px_32px_32px] lg:gap-2">
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

        <DashboardDueDateControl
          dueDate={task.due_date}
          disabled={!canUpdate}
          taskTitle={taskTitle}
          onChange={(dueDate) => onUpdate(task.id, { due_date: dueDate })}
        />

        <div
          className="hidden w-32 shrink-0 flex-col gap-0.5 lg:flex"
          title={`Odpracované ${formatHours(actualHours)}, odhad ${
            estimatedHours > 0 ? formatHours(estimatedHours) : "nie je nastavený"
          }, ${timeStatusLabel}`}
        >
          <div className="flex items-center gap-1 whitespace-nowrap text-[10px]">
            <Clock3
              className={cn(
                "h-3 w-3 shrink-0",
                isTimerActive ? "text-emerald-500" : "text-muted-foreground"
              )}
            />
            <span className="font-semibold tabular-nums text-foreground">
              {formatHours(actualHours)}
            </span>
            <span className="text-muted-foreground">
              / {estimatedHours > 0 ? formatHours(estimatedHours) : "bez odhadu"}
            </span>
          </div>
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
            <span
              className={cn(
                "whitespace-nowrap text-[8px] tabular-nums text-muted-foreground",
                exceededHours > 0 && "font-medium text-destructive"
              )}
            >
              {timeStatusLabel}
            </span>
          </div>
        </div>

        <div
          className="flex w-10 shrink-0 justify-center lg:w-14"
          role="group"
          aria-label={
            task.assignees && task.assignees.length > 0
              ? "Priradení používatelia"
              : "Bez priradeného používateľa"
          }
        >
          {task.assignees && task.assignees.length > 0 ? (
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 2).map((assignee) => {
                const name = assignee.user?.name || assignee.user?.email || "Používateľ";
                return (
                  <Avatar key={assignee.id} className="h-6 w-6 border border-card">
                    <AvatarFallback className="bg-muted text-[8px] font-medium text-muted-foreground">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
            </div>
          ) : (
            <span aria-hidden="true" className="h-6 w-6" />
          )}
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
