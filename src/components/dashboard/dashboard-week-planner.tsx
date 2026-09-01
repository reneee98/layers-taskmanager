"use client";

import { useMemo, useState } from "react";
import { addDays, format, isToday, startOfDay } from "date-fns";
import { sk } from "date-fns/locale";
import {
  CalendarDays,
  CalendarPlus,
  Clock3,
  FolderKanban,
  Plus,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";

import { DashboardTaskSchedulerDialog } from "@/components/dashboard/dashboard-task-scheduler-dialog";
import type { DashboardTaskItem } from "@/components/dashboard/dashboard-task-row";
import { PrioritySelect, type TaskPriority } from "@/components/tasks/PrioritySelect";
import { StatusSelect } from "@/components/tasks/StatusSelect";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceUsers } from "@/contexts/WorkspaceUsersContext";
import { formatHours } from "@/lib/format";
import type { TaskStatus } from "@/lib/task-status";
import { cn, stripHtml } from "@/lib/utils";
import { projectColorToRgba, resolveProjectColor } from "@/lib/project-colors";
import { resolveTaskColor, taskColorToRgba } from "@/lib/task-colors";

interface DashboardWeekPlannerProps {
  tasks: DashboardTaskItem[];
  unscheduledTasks: DashboardTaskItem[];
  canCreateTask: boolean;
  canScheduleTask: boolean;
  canUpdateTaskStatus: boolean;
  canUpdateTaskPriority: boolean;
  onCreateTask: (dueDate: string) => void;
  onOpenTask: (task: DashboardTaskItem) => void;
  onScheduleTask: (taskId: string, startDate: string, dueDate: string) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  onUpdateTaskPriority: (taskId: string, priority: TaskPriority) => Promise<void>;
}

const DAILY_CAPACITY_HOURS = 8;
const ALL_USERS_FILTER = "all";
const UNASSIGNED_FILTER = "unassigned";

const getTaskHref = (task: DashboardTaskItem) =>
  task.project?.id ? `/projects/${task.project.id}/tasks/${task.id}` : `/tasks/${task.id}`;

const getRemainingHours = (task: DashboardTaskItem) =>
  Math.max((task.estimated_hours || 0) - (task.actual_hours || 0), 0);

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getAssigneeName = (assignee: NonNullable<DashboardTaskItem["assignees"]>[number]) =>
  assignee.user?.name || assignee.user?.email || "Používateľ";

const matchesAssigneeFilter = (task: DashboardTaskItem, filter: string) => {
  const assignees = task.assignees || [];
  if (filter === ALL_USERS_FILTER) return true;
  if (filter === UNASSIGNED_FILTER) return assignees.length === 0;
  return assignees.some((assignee) => assignee.user_id === filter);
};

const isTaskScheduledOn = (task: DashboardTaskItem, date: string) => {
  const startDate = task.start_date || task.due_date;
  const dueDate = task.due_date || task.start_date;
  if (!startDate || !dueDate) return false;
  return date >= startDate && date <= dueDate;
};

const getCapacity = (tasks: DashboardTaskItem[]) => {
  const estimatedTasks = tasks.filter((task) => (task.estimated_hours || 0) > 0);
  const remainingHours = estimatedTasks.reduce((total, task) => total + getRemainingHours(task), 0);
  const unestimatedTaskCount = tasks.length - estimatedTasks.length;

  if (tasks.length === 0) {
    return {
      label: "Voľno",
      tone: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-400",
      surface: "bg-emerald-500/[0.025]",
    };
  }

  if (estimatedTasks.length === 0) {
    return {
      label: "Bez odhadu",
      tone: "border-slate-500/20 bg-slate-500/[0.07] text-slate-600 dark:text-slate-400",
      surface: "bg-muted/[0.14]",
    };
  }

  if (unestimatedTaskCount > 0) {
    return {
      label: `${formatHours(remainingHours)} + bez odhadu`,
      tone: "border-slate-500/20 bg-slate-500/[0.07] text-slate-600 dark:text-slate-400",
      surface: "bg-muted/[0.14]",
    };
  }

  if (remainingHours < DAILY_CAPACITY_HOURS) {
    const freeHours = DAILY_CAPACITY_HOURS - remainingHours;

    return {
      label: `${formatHours(freeHours)} voľných`,
      tone:
        freeHours >= 4
          ? "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-400"
          : "border-sky-500/20 bg-sky-500/[0.07] text-sky-700 dark:text-sky-400",
      surface: freeHours >= 4 ? "bg-emerald-500/[0.025]" : "bg-sky-500/[0.02]",
    };
  }

  if (remainingHours === DAILY_CAPACITY_HOURS) {
    return {
      label: "Plný deň",
      tone: "border-amber-500/20 bg-amber-500/[0.07] text-amber-700 dark:text-amber-400",
      surface: "bg-amber-500/[0.02]",
    };
  }

  return {
    label: `${formatHours(remainingHours - DAILY_CAPACITY_HOURS)} nad kapacitu`,
    tone: "border-rose-500/20 bg-rose-500/[0.07] text-rose-700 dark:text-rose-400",
    surface: "bg-rose-500/[0.025]",
  };
};

const getTeamCapacity = (tasks: DashboardTaskItem[], peopleCount: number) => {
  if (tasks.length === 0) {
    return {
      label: "Tím voľný",
      tone: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-400",
      surface: "bg-emerald-500/[0.025]",
    };
  }

  const busyPeople = new Set(
    tasks.flatMap((task) => (task.assignees || []).map((assignee) => assignee.user_id))
  );
  const unassignedTaskCount = tasks.filter((task) => (task.assignees || []).length === 0).length;

  return {
    label:
      busyPeople.size > 0
        ? `${busyPeople.size}/${Math.max(peopleCount, busyPeople.size)} ľudí má úlohy`
        : `${unassignedTaskCount} bez riešiteľa`,
    tone: "border-sky-500/20 bg-sky-500/[0.07] text-sky-700 dark:text-sky-400",
    surface: "bg-sky-500/[0.02]",
  };
};

const getUnassignedCapacity = (tasks: DashboardTaskItem[]) => ({
  label: tasks.length === 0 ? "Bez úloh" : `${tasks.length} bez riešiteľa`,
  tone:
    tasks.length === 0
      ? "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-400"
      : "border-amber-500/20 bg-amber-500/[0.07] text-amber-700 dark:text-amber-400",
  surface: tasks.length === 0 ? "bg-emerald-500/[0.025]" : "bg-amber-500/[0.02]",
});

export const DashboardWeekPlanner = ({
  tasks,
  unscheduledTasks,
  canCreateTask,
  canScheduleTask,
  canUpdateTaskStatus,
  canUpdateTaskPriority,
  onCreateTask,
  onOpenTask,
  onScheduleTask,
  onUpdateTaskStatus,
  onUpdateTaskPriority,
}: DashboardWeekPlannerProps) => {
  const { user } = useAuth();
  const { users: workspaceUsers } = useWorkspaceUsers();
  const [assigneeFilter, setAssigneeFilter] = useState(ALL_USERS_FILTER);
  const [schedulerDate, setSchedulerDate] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const days = Array.from({ length: 5 }, (_, index) => addDays(today, index));
  const people = useMemo(
    () =>
      workspaceUsers
        .filter((workspaceUser) => workspaceUser.profiles)
        .map((workspaceUser) => ({
          id: workspaceUser.profiles.id,
          name: workspaceUser.profiles.display_name || workspaceUser.profiles.email,
        }))
        .sort((firstPerson, secondPerson) =>
          firstPerson.name.localeCompare(secondPerson.name, "sk")
        ),
    [workspaceUsers]
  );
  const currentPerson = people.find((person) => person.id === user?.id);
  const otherPeople = people.filter((person) => person.id !== user?.id);
  const filteredTasks = tasks.filter((task) => matchesAssigneeFilter(task, assigneeFilter));
  const filteredUnscheduledTasks = unscheduledTasks.filter((task) =>
    matchesAssigneeFilter(task, assigneeFilter)
  );
  const totalRemainingHours = filteredTasks.reduce(
    (total, task) => total + getRemainingHours(task),
    0
  );

  const handleOpenScheduler = (dueDate: string) => {
    if (!canScheduleTask) return;
    setSchedulerDate(dueDate);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/[0.13] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/15 bg-sky-500/[0.07] text-sky-600 dark:text-sky-400">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium text-foreground">Kapacita tímu podľa termínov</p>
            <p className="text-[11px] text-muted-foreground">
              Voľno počítame zo zostávajúcich hodín pri pracovnom dni s kapacitou 08:00.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium tabular-nums">
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger
              aria-label="Filtrovať kalendár podľa človeka"
              className="h-8 w-[190px] gap-2 bg-card text-xs"
            >
              <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Vybrať človeka" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_USERS_FILTER}>Všetci ľudia</SelectItem>
              {currentPerson && (
                <SelectItem value={currentPerson.id}>Ja · {currentPerson.name}</SelectItem>
              )}
              {otherPeople.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
              <SelectItem value={UNASSIGNED_FILTER}>Nepriradené</SelectItem>
            </SelectContent>
          </Select>

          <span className="rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground">
            {filteredTasks.length} naplánovaných
          </span>
          <span className="rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground">
            {formatHours(totalRemainingHours)} ostáva
          </span>
          {filteredUnscheduledTasks.length > 0 && (
            <span className="rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-2 py-1.5 text-amber-700 dark:text-amber-400">
              {filteredUnscheduledTasks.length} bez termínu
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <div className="grid min-w-[820px] grid-cols-5 divide-x divide-border/70 xl:min-w-0">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayTasks = filteredTasks.filter((task) => isTaskScheduledOn(task, dateKey));
            const capacity =
              assigneeFilter === ALL_USERS_FILTER
                ? getTeamCapacity(dayTasks, people.length)
                : assigneeFilter === UNASSIGNED_FILTER
                  ? getUnassignedCapacity(dayTasks)
                  : getCapacity(dayTasks);

            return (
              <section
                key={dateKey}
                aria-label={format(day, "EEEE d. MMMM", { locale: sk })}
                className={cn("flex min-h-[340px] min-w-0 flex-col", capacity.surface)}
              >
                <div className="border-b border-border/60 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                          isToday(day) && "text-sky-600 dark:text-sky-400"
                        )}
                      >
                        {isToday(day) ? "Dnes" : format(day, "EEEE", { locale: sk })}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                        {format(day, "d. MMM", { locale: sk })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!canCreateTask}
                      onClick={() => onCreateTask(dateKey)}
                      aria-label={`Vytvoriť novú úlohu na ${format(day, "d. MMMM", { locale: sk })}`}
                      title="Vytvoriť novú úlohu"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-card hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span
                    className={cn(
                      "mt-2 inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tabular-nums",
                      capacity.tone
                    )}
                  >
                    {capacity.label}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-1.5 p-2">
                  {dayTasks.map((task) => {
                    const remainingHours = getRemainingHours(task);
                    const estimatedHours = task.estimated_hours || 0;
                    const actualHours = task.actual_hours || 0;
                    const hasEstimate = estimatedHours > 0;
                    const timeProgress = hasEstimate
                      ? Math.min((actualHours / estimatedHours) * 100, 100)
                      : 0;
                    const isOverEstimate = hasEstimate && actualHours > estimatedHours;
                    const assignees = task.assignees || [];
                    const projectColor = resolveProjectColor(task.project);
                    const taskColor = resolveTaskColor(task);

                    return (
                      <div
                        key={task.id}
                        style={
                          taskColor
                            ? {
                                borderColor: taskColorToRgba(taskColor, 0.22),
                                boxShadow: `inset 3px 0 0 ${taskColor}`,
                                backgroundImage: `linear-gradient(135deg, ${taskColorToRgba(
                                  taskColor,
                                  0.09
                                )}, ${taskColorToRgba(taskColor, 0.02)} 60%, transparent)`,
                              }
                            : undefined
                        }
                        className="group rounded-lg border border-border/80 bg-card/90 p-2.5 shadow-sm outline-none transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-foreground/20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <Link
                            href={getTaskHref(task)}
                            aria-label={`Otvoriť projekt a úlohu ${stripHtml(task.title)}`}
                            className="flex min-w-0 flex-1 items-center gap-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <FolderKanban
                              className="h-3 w-3 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            {task.project?.code && (
                              <span
                                className="shrink-0 rounded px-1 py-px font-mono text-[9px] font-semibold text-foreground"
                                style={
                                  projectColor
                                    ? {
                                        backgroundColor: projectColorToRgba(projectColor, 0.07),
                                      }
                                    : undefined
                                }
                              >
                                {task.project.code}
                              </span>
                            )}
                            <span className="truncate text-[10px] font-semibold text-foreground">
                              {task.project?.name || "Bez projektu"}
                            </span>
                          </Link>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <PrioritySelect
                              priority={task.priority as TaskPriority}
                              disabled={!canUpdateTaskPriority}
                              size="flag"
                              onPriorityChange={(priority) =>
                                onUpdateTaskPriority(task.id, priority)
                              }
                            />
                            <StatusSelect
                              status={task.status as TaskStatus}
                              disabled={!canUpdateTaskStatus}
                              size="planner"
                              onStatusChange={(status) => onUpdateTaskStatus(task.id, status)}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenTask(task)}
                          aria-label={`Otvoriť úlohu ${stripHtml(task.title)}`}
                          className="mt-2 block w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <p className="line-clamp-2 text-xs font-semibold leading-4 text-foreground">
                            {stripHtml(task.title)}
                          </p>

                          {hasEstimate ? (
                            <div className="mt-2.5">
                              <div className="mb-1.5 flex items-center justify-between gap-2 text-[9px] tabular-nums">
                                <span className="font-semibold text-foreground">
                                  {formatHours(actualHours)} z {formatHours(estimatedHours)}
                                </span>
                                <span
                                  className={cn(
                                    "flex shrink-0 items-center gap-1 font-medium text-muted-foreground",
                                    isOverEstimate && "text-rose-600 dark:text-rose-400"
                                  )}
                                >
                                  <Clock3 className="h-3 w-3" />
                                  {isOverEstimate
                                    ? `${formatHours(actualHours - estimatedHours)} navyše`
                                    : `${formatHours(remainingHours)} ostáva`}
                                </span>
                              </div>
                              <div
                                role="progressbar"
                                aria-label={`Odpracovaných ${formatHours(actualHours)} z ${formatHours(estimatedHours)}`}
                                aria-valuemin={0}
                                aria-valuemax={estimatedHours}
                                aria-valuenow={Math.min(actualHours, estimatedHours)}
                                className="h-1.5 overflow-hidden rounded-full bg-muted"
                              >
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-[width] duration-300",
                                    isOverEstimate ? "bg-rose-500" : "bg-sky-500"
                                  )}
                                  style={{ width: `${timeProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground">
                              <Clock3 className="h-3 w-3" />
                              Bez časového odhadu
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2">
                            {assignees.length > 0 ? (
                              <>
                                <span className="flex -space-x-1.5">
                                  {assignees.slice(0, 2).map((assignee) => {
                                    const name = getAssigneeName(assignee);
                                    return (
                                      <Avatar
                                        key={assignee.id}
                                        title={name}
                                        className="h-5 w-5 border border-card"
                                      >
                                        <AvatarFallback className="text-[8px]">
                                          {getInitials(name)}
                                        </AvatarFallback>
                                      </Avatar>
                                    );
                                  })}
                                </span>
                                <span className="min-w-0 truncate text-[9px] text-muted-foreground">
                                  {getAssigneeName(assignees[0])}
                                  {assignees.length > 1 ? ` +${assignees.length - 1}` : ""}
                                </span>
                              </>
                            ) : (
                              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                <UserRound className="h-3 w-3" />
                                Nepriradené
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    disabled={!canScheduleTask}
                    onClick={() => handleOpenScheduler(dateKey)}
                    className={cn(
                      "group flex min-h-20 flex-1 flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60",
                      dayTasks.length === 0
                        ? "border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04]"
                        : "mt-0.5 flex-none border-border/80 hover:border-sky-500/30 hover:bg-sky-500/[0.04]"
                    )}
                  >
                    <CalendarPlus
                      className={cn(
                        "mb-1.5 h-4 w-4",
                        dayTasks.length === 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        dayTasks.length === 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-foreground"
                      )}
                    >
                      {dayTasks.length === 0 ? "Naplánovať existujúcu úlohu" : "Naplánovať ďalšiu"}
                    </span>
                    {dayTasks.length === 0 && (
                      <span className="mt-1 text-[9px] leading-4 text-muted-foreground">
                        Vyberiete z úloh bez termínu
                      </span>
                    )}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <DashboardTaskSchedulerDialog
        open={schedulerDate !== null}
        dueDate={schedulerDate}
        tasks={filteredUnscheduledTasks}
        onOpenChange={(open) => {
          if (!open) setSchedulerDate(null);
        }}
        onSchedule={onScheduleTask}
      />
    </div>
  );
};
