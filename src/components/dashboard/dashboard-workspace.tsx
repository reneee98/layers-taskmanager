"use client";

import { useMemo, useState } from "react";
import { addDays, format, isToday, parseISO, startOfDay } from "date-fns";
import { sk } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  FolderKanban,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import {
  DashboardTaskRow,
  type DashboardTaskItem,
  type DashboardTaskUpdate,
} from "@/components/dashboard/dashboard-task-row";
import { DashboardWeekPlanner } from "@/components/dashboard/dashboard-week-planner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface DashboardProjectItem {
  id: string;
  name: string;
  code: string | null;
  status: string;
  client?: {
    id?: string;
    name: string;
  } | null;
}

interface DashboardWorkspaceProps {
  tasks: DashboardTaskItem[];
  workspaceTasks: DashboardTaskItem[];
  projects: DashboardProjectItem[];
  canUpdateTasks: boolean;
  canViewPrices: boolean;
  showStats: boolean;
  showTasks: boolean;
  showProjects: boolean;
  quickTaskDisabled: boolean;
  onQuickTask: (dueDate?: string) => void;
  onUpdateTask: (taskId: string, updates: DashboardTaskUpdate) => Promise<void>;
  onTimeTracked: (taskId: string, hours: number) => void;
  onCompleteProject?: (projectId: string) => Promise<void>;
}

const isPersonalProject = (project: DashboardProjectItem) =>
  project.name === "Osobné úlohy" ||
  (project.code !== null && (project.code === "PERSONAL" || project.code.startsWith("PERSONAL-")));

type FocusFilter =
  | "week"
  | "all"
  | "todo"
  | "in_progress"
  | "review"
  | "sent_to_client"
  | "done";

const STATUS_FILTERS = ["todo", "in_progress", "review", "sent_to_client", "done"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const isStatusFilter = (filter: FocusFilter): filter is StatusFilter =>
  (STATUS_FILTERS as readonly string[]).includes(filter);

const statusFilterLabels: Record<StatusFilter, string> = {
  todo: "Na spracovanie",
  in_progress: "V procese",
  review: "Na kontrole",
  sent_to_client: "Odoslané klientovi",
  done: "Dokončené",
};

const getTaskTime = (task: DashboardTaskItem) => {
  if (!task.due_date) {
    return Number.POSITIVE_INFINITY;
  }

  return parseISO(task.due_date).getTime();
};

const sortTasks = (items: DashboardTaskItem[]) =>
  [...items].sort((firstTask, secondTask) => {
    const firstUrgency =
      firstTask.priority === "urgent" ? 0 : firstTask.priority === "high" ? 1 : 2;
    const secondUrgency =
      secondTask.priority === "urgent" ? 0 : secondTask.priority === "high" ? 1 : 2;

    if (getTaskTime(firstTask) !== getTaskTime(secondTask)) {
      return getTaskTime(firstTask) - getTaskTime(secondTask);
    }

    return firstUrgency - secondUrgency;
  });

const getActiveTaskLabel = (count: number) => {
  if (count === 1) return "1 aktívna úloha";
  if (count >= 2 && count <= 4) return `${count} aktívne úlohy`;
  return `${count} aktívnych úloh`;
};

export const DashboardWorkspace = ({
  tasks,
  workspaceTasks,
  projects,
  canUpdateTasks,
  canViewPrices,
  showStats,
  showTasks,
  showProjects,
  quickTaskDisabled,
  onQuickTask,
  onUpdateTask,
  onTimeTracked,
  onCompleteProject,
}: DashboardWorkspaceProps) => {
  const [focusFilter, setFocusFilter] = useState<FocusFilter>("week");
  const [completingProjectId, setCompletingProjectId] = useState<string | null>(null);
  const [isFocusCollapsed, setIsFocusCollapsed] = useState(false);
  const [expandedProjectState, setExpandedProjectState] = useState<string | null | undefined>(
    undefined
  );
  const [showAllFocusTasks, setShowAllFocusTasks] = useState(false);

  const todayTimestamp = startOfDay(new Date()).getTime();
  const plannerEndTimestamp = addDays(new Date(todayTimestamp), 4).getTime();

  const projectTasksById = useMemo(() => {
    const groupedTasks = new Map<string, DashboardTaskItem[]>();

    workspaceTasks.forEach((task) => {
      // Sekcia projektov ukazuje len otvorenú prácu
      if (task.status === "done" || task.status === "cancelled") return;

      const projectId = task.project?.id;
      if (!projectId) return;

      groupedTasks.set(projectId, [...(groupedTasks.get(projectId) || []), task]);
    });

    groupedTasks.forEach((projectTasks, projectId) => {
      groupedTasks.set(projectId, sortTasks(projectTasks));
    });

    return groupedTasks;
  }, [workspaceTasks]);

  const activeProjects = useMemo(() => {
    const projectsWithActiveWork = projects.filter(
      (project) =>
        !["completed", "cancelled"].includes(project.status) &&
        (projectTasksById.get(project.id)?.length || 0) > 0
    );

    return projectsWithActiveWork.sort((firstProject, secondProject) => {
      const countDifference =
        (projectTasksById.get(secondProject.id)?.length || 0) -
        (projectTasksById.get(firstProject.id)?.length || 0);
      return countDifference || firstProject.name.localeCompare(secondProject.name, "sk");
    });
  }, [projectTasksById, projects]);

  const fallbackExpandedProjectId =
    tasks.find((task) => task.project?.id)?.project?.id || activeProjects[0]?.id || null;
  const expandedProjectId =
    expandedProjectState === undefined ? fallbackExpandedProjectId : expandedProjectState;

  const focusTasks = useMemo(() => {
    // Stavové filtre pracujú s celým workspace (agentúrny pohľad na flow)
    if (isStatusFilter(focusFilter)) {
      return sortTasks(workspaceTasks.filter((task) => task.status === focusFilter));
    }

    const filtered = tasks.filter((task) => {
      // Časové filtre ukazujú len otvorenú prácu
      if (task.status === "done" || task.status === "cancelled") {
        return false;
      }

      if (focusFilter === "all") {
        return true;
      }

      if (task.status === "in_progress") {
        return true;
      }

      if (!task.due_date) {
        return false;
      }

      const dueTimestamp = startOfDay(parseISO(task.due_date)).getTime();
      return dueTimestamp <= plannerEndTimestamp;
    });

    return sortTasks(filtered);
  }, [focusFilter, tasks, workspaceTasks, plannerEndTimestamp]);

  const statusCounts = useMemo(() => {
    const counts = { todo: 0, in_progress: 0, review: 0, sent_to_client: 0, done: 0 } as Record<
      StatusFilter,
      number
    >;
    workspaceTasks.forEach((task) => {
      if ((STATUS_FILTERS as readonly string[]).includes(task.status)) {
        counts[task.status as StatusFilter] += 1;
      }
    });
    return counts;
  }, [workspaceTasks]);

  const openTasks = tasks.filter((task) => task.status !== "done" && task.status !== "cancelled");
  const overdueCount = openTasks.filter((task) => {
    if (!task.due_date) return false;
    return startOfDay(parseISO(task.due_date)).getTime() < todayTimestamp;
  }).length;
  const todayCount = openTasks.filter(
    (task) => task.due_date && isToday(parseISO(task.due_date))
  ).length;
  const inProgressCount = openTasks.filter((task) => task.status === "in_progress").length;
  const weekPlannerTasks = useMemo(() => {
    const lastPlannerDayTimestamp = addDays(new Date(todayTimestamp), 4).getTime();

    return sortTasks(
      workspaceTasks.filter((task) => {
        if (task.status === "done" || task.status === "cancelled" || !task.due_date) return false;

        const startTimestamp = startOfDay(parseISO(task.start_date || task.due_date)).getTime();
        const dueTimestamp = startOfDay(parseISO(task.due_date)).getTime();
        return dueTimestamp >= todayTimestamp && startTimestamp <= lastPlannerDayTimestamp;
      })
    );
  }, [todayTimestamp, workspaceTasks]);
  const unscheduledPlannerTasks = useMemo(
    () =>
      sortTasks(
        workspaceTasks.filter(
          (task) => task.status !== "done" && task.status !== "cancelled" && task.due_date === null
        )
      ),
    [workspaceTasks]
  );
  const visibleFocusTasks = showAllFocusTasks ? focusTasks : focusTasks.slice(0, 6);
  const focusTaskCount = focusFilter === "week" ? weekPlannerTasks.length : focusTasks.length;

  const focusFilterDescription = isStatusFilter(focusFilter)
    ? `Všetky úlohy vo workspace so statusom „${statusFilterLabels[focusFilter]}“`
    : focusFilter === "week"
      ? "Tímové termíny, riešitelia a voľná kapacita na najbližších päť dní"
      : "Všetky aktívne úlohy priradené vám";

  const focusSectionTitle = isStatusFilter(focusFilter)
    ? statusFilterLabels[focusFilter]
    : focusFilter === "week"
      ? "Plán na 5 dní"
      : "Čaká na mňa";

  const handleToggleProject = (projectId: string) => {
    setExpandedProjectState((currentProjectId) => {
      const currentExpandedProjectId =
        currentProjectId === undefined ? fallbackExpandedProjectId : currentProjectId;

      return currentExpandedProjectId === projectId ? null : projectId;
    });
  };

  const handleCompleteProject = async (project: DashboardProjectItem) => {
    if (!onCompleteProject || completingProjectId) return;

    const openCount = (projectTasksById.get(project.id) || []).length;
    const confirmed = confirm(
      openCount > 0
        ? `Označiť projekt „${project.name}“ ako hotový? Projekt sa archivuje a zmizne z dashboardu (má ešte ${openCount} otvorených úloh).`
        : `Označiť projekt „${project.name}“ ako hotový? Projekt sa archivuje a zmizne z dashboardu.`
    );
    if (!confirmed) return;

    setCompletingProjectId(project.id);
    try {
      await onCompleteProject(project.id);
    } finally {
      setCompletingProjectId(null);
    }
  };

  return (
    <div className="page-shell">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            {format(new Date(), "EEEE, d. MMMM", { locale: sk })}
          </div>
          <h1 className="page-heading">Pracovný prehľad</h1>
          <p className="page-description">
            To najdôležitejšie na jednom mieste, bez zbytočného šumu.
          </p>
        </div>
        <Button onClick={() => onQuickTask()} disabled={quickTaskDisabled}>
          <Plus className="h-4 w-4" />
          Rýchla úloha
        </Button>
      </header>

      {showStats && (
        <section className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4">
          {[
            { label: "Dnes", value: todayCount, icon: CalendarClock, tone: "text-foreground" },
            {
              label: "Po termíne",
              value: overdueCount,
              icon: AlertTriangle,
              tone: overdueCount > 0 ? "text-destructive" : "text-foreground",
            },
            {
              label: "V procese",
              value: inProgressCount,
              icon: CheckCircle2,
              tone: "text-foreground",
            },
            {
              label: "Projekty v práci",
              value: activeProjects.length,
              icon: FolderKanban,
              tone: "text-foreground",
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="flex items-center gap-3 border-b border-border/70 px-4 py-3 odd:border-r [&:nth-child(n+3)]:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0"
            >
              <metric.icon className={`h-4 w-4 ${metric.tone}`} />
              <div className="min-w-0">
                <div className={`text-lg font-semibold tabular-nums ${metric.tone}`}>
                  {metric.value}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{metric.label}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {showTasks && (
        <section className="surface-panel overflow-hidden">
          <div
            className={cn(
              "flex flex-col gap-3 px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between",
              !isFocusCollapsed && "border-b border-border"
            )}
          >
            <button
              type="button"
              onClick={() => setIsFocusCollapsed((current) => !current)}
              aria-expanded={!isFocusCollapsed}
              aria-controls="dashboard-focus-tasks"
              className="group flex min-h-10 min-w-0 items-center gap-2.5 rounded-lg text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  isFocusCollapsed && "-rotate-90"
                )}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{focusSectionTitle}</span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {focusTaskCount}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {focusFilterDescription}
                </span>
              </span>
            </button>

            {!isFocusCollapsed && (
              <Tabs
                value={focusFilter}
                onValueChange={(value) => {
                  setFocusFilter(value as FocusFilter);
                  setShowAllFocusTasks(false);
                }}
                className="min-w-0"
              >
                <div className="overflow-x-auto scrollbar-hide">
                  <TabsList className="w-max">
                    <TabsTrigger value="week">5 dní</TabsTrigger>
                    <TabsTrigger value="all">Všetky</TabsTrigger>
                    <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-border" />
                    {STATUS_FILTERS.map((status) => (
                      <TabsTrigger key={status} value={status} className="gap-1.5">
                        {statusFilterLabels[status]}
                        {statusCounts[status] > 0 && (
                          <span className="rounded bg-muted px-1 py-px text-[9px] font-semibold tabular-nums text-muted-foreground">
                            {statusCounts[status]}
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </Tabs>
            )}
          </div>

          {!isFocusCollapsed && (
            <div id="dashboard-focus-tasks">
              {focusFilter === "week" ? (
                <DashboardWeekPlanner
                  tasks={weekPlannerTasks}
                  unscheduledTasks={unscheduledPlannerTasks}
                  canCreateTask={!quickTaskDisabled}
                  canScheduleTask={canUpdateTasks}
                  onCreateTask={onQuickTask}
                  onScheduleTask={(taskId, startDate, dueDate) =>
                    onUpdateTask(taskId, { start_date: startDate, due_date: dueDate })
                  }
                />
              ) : visibleFocusTasks.length > 0 ? (
                <div>
                  {visibleFocusTasks.map((task) => (
                    <DashboardTaskRow
                      key={task.id}
                      task={task}
                      canUpdate={canUpdateTasks}
                      canViewPrices={canViewPrices}
                      onUpdate={onUpdateTask}
                      onTimeTracked={onTimeTracked}
                    />
                  ))}
                  {focusTasks.length > 6 && (
                    <div className="border-t border-border/70 px-4 py-2 sm:px-5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllFocusTasks((current) => !current)}
                        className="text-muted-foreground"
                      >
                        {showAllFocusTasks
                          ? "Zobraziť menej"
                          : `Zobraziť všetky (${focusTasks.length})`}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center">
                  <CheckCircle2 className="mb-3 h-7 w-7 text-emerald-500" />
                  <p className="text-sm font-medium text-foreground">
                    V tejto chvíli je všetko vybavené
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                    Prepnite na „Všetky“, ak chcete zobraziť aj ďalšiu prácu.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {showProjects && (
        <section className="surface-panel overflow-hidden">
          <div className="border-b border-border px-3 py-3 sm:px-4">
            <h2 className="text-sm font-semibold text-foreground">Projekty a ich úlohy</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Rozbaľte projekt a zobrazte jeho aktívne úlohy priamo na dashboarde.
            </p>
          </div>

          {activeProjects.length > 0 ? (
            <div>
              {activeProjects.map((project) => {
                const projectTasks = projectTasksById.get(project.id) || [];
                const isExpanded = expandedProjectId === project.id;
                const taskContainerId = `dashboard-project-${project.id}`;

                return (
                  <div key={project.id} className="border-b border-border/70 last:border-b-0">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3",
                        isExpanded && "bg-muted/25"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleProject(project.id)}
                        aria-expanded={isExpanded}
                        aria-controls={taskContainerId}
                        className="group flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 text-left outline-none transition-colors hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                            !isExpanded && "-rotate-90"
                          )}
                        />
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-500/[0.08] text-sky-600 dark:text-sky-400">
                          <FolderKanban className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {project.name}
                            </span>
                            {project.code && (
                              <span className="hidden shrink-0 rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
                                {project.code}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {project.client?.name || "Interný projekt"} ·{" "}
                            {getActiveTaskLabel(projectTasks.length)}
                          </span>
                        </span>
                      </button>

                      {onCompleteProject && !isPersonalProject(project) && (
                        <button
                          type="button"
                          onClick={() => handleCompleteProject(project)}
                          disabled={completingProjectId !== null}
                          aria-label={`Označiť projekt ${project.name} ako hotový`}
                          title="Označiť projekt ako hotový (archivuje sa)"
                          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-emerald-500/[0.08] hover:text-emerald-600 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:px-2.5 dark:hover:text-emerald-400"
                        >
                          {completingProjectId === project.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Hotové</span>
                        </button>
                      )}

                      <Link
                        href={`/projects/${project.id}`}
                        aria-label={`Otvoriť projekt ${project.name}`}
                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:px-2.5"
                      >
                        <span className="hidden sm:inline">Otvoriť</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {isExpanded && (
                      <div
                        id={taskContainerId}
                        className="border-t border-border/60 bg-muted/[0.06] pl-2 sm:pl-6"
                      >
                        {projectTasks.map((task) => (
                          <DashboardTaskRow
                            key={task.id}
                            task={task}
                            canUpdate={canUpdateTasks}
                            canViewPrices={canViewPrices}
                            showProject={false}
                            onUpdate={onUpdateTask}
                            onTimeTracked={onTimeTracked}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
              <FolderKanban className="mb-3 h-7 w-7 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">Žiadne aktívne projekty</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
