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
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import {
  DashboardTaskRow,
  type DashboardTaskItem,
  type DashboardTaskUpdate,
} from "@/components/dashboard/dashboard-task-row";
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
  showStats: boolean;
  showTasks: boolean;
  showProjects: boolean;
  quickTaskDisabled: boolean;
  onQuickTask: () => void;
  onUpdateTask: (taskId: string, updates: DashboardTaskUpdate) => Promise<void>;
  onTimeTracked: (taskId: string, hours: number) => void;
}

type FocusFilter = "now" | "week" | "all";

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
  showStats,
  showTasks,
  showProjects,
  quickTaskDisabled,
  onQuickTask,
  onUpdateTask,
  onTimeTracked,
}: DashboardWorkspaceProps) => {
  const [focusFilter, setFocusFilter] = useState<FocusFilter>("now");
  const [isFocusCollapsed, setIsFocusCollapsed] = useState(false);
  const [expandedProjectState, setExpandedProjectState] = useState<string | null | undefined>(
    undefined
  );
  const [showAllFocusTasks, setShowAllFocusTasks] = useState(false);

  const todayTimestamp = startOfDay(new Date()).getTime();
  const weekEndTimestamp = addDays(new Date(todayTimestamp), 7).getTime();

  const projectTasksById = useMemo(() => {
    const groupedTasks = new Map<string, DashboardTaskItem[]>();

    workspaceTasks.forEach((task) => {
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
    const filtered = tasks.filter((task) => {
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
      if (focusFilter === "now") {
        return dueTimestamp <= todayTimestamp;
      }

      return dueTimestamp <= weekEndTimestamp;
    });

    return sortTasks(filtered);
  }, [focusFilter, tasks, todayTimestamp, weekEndTimestamp]);

  const overdueCount = tasks.filter((task) => {
    if (!task.due_date) return false;
    return startOfDay(parseISO(task.due_date)).getTime() < todayTimestamp;
  }).length;
  const todayCount = tasks.filter(
    (task) => task.due_date && isToday(parseISO(task.due_date))
  ).length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const visibleFocusTasks = showAllFocusTasks ? focusTasks : focusTasks.slice(0, 6);

  const focusFilterDescription =
    focusFilter === "now"
      ? "Po termíne, na dnes a rozpracované"
      : focusFilter === "week"
        ? "Termíny počas najbližších siedmich dní"
        : "Všetky aktívne úlohy priradené vám";

  const handleToggleProject = (projectId: string) => {
    setExpandedProjectState((currentProjectId) => {
      const currentExpandedProjectId =
        currentProjectId === undefined ? fallbackExpandedProjectId : currentProjectId;

      return currentExpandedProjectId === projectId ? null : projectId;
    });
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
        <Button onClick={onQuickTask} disabled={quickTaskDisabled}>
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
              "flex flex-col gap-4 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between",
              !isFocusCollapsed && "border-b border-border"
            )}
          >
            <button
              type="button"
              onClick={() => setIsFocusCollapsed((current) => !current)}
              aria-expanded={!isFocusCollapsed}
              aria-controls="dashboard-focus-tasks"
              className="group flex min-h-11 min-w-0 items-center gap-3 rounded-lg text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  isFocusCollapsed && "-rotate-90"
                )}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Čaká na mňa</span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {focusTasks.length}
                  </span>
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
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
              >
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="now" className="flex-1 sm:flex-none">
                    Teraz
                  </TabsTrigger>
                  <TabsTrigger value="week" className="flex-1 sm:flex-none">
                    7 dní
                  </TabsTrigger>
                  <TabsTrigger value="all" className="flex-1 sm:flex-none">
                    Všetky
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          {!isFocusCollapsed && (
            <div id="dashboard-focus-tasks">
              {visibleFocusTasks.length > 0 ? (
                <div>
                  {visibleFocusTasks.map((task) => (
                    <DashboardTaskRow
                      key={task.id}
                      task={task}
                      canUpdate={canUpdateTasks}
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
                    Prepnite na „7 dní“ alebo „Všetky“, ak chcete plánovať ďalšiu prácu.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {showProjects && (
        <section className="surface-panel overflow-hidden">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">Projekty a ich úlohy</h2>
            <p className="mt-1 text-xs text-muted-foreground">
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
                        "flex items-center gap-2 px-3 py-2 sm:px-4",
                        isExpanded && "bg-muted/20"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleProject(project.id)}
                        aria-expanded={isExpanded}
                        aria-controls={taskContainerId}
                        className="group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                            !isExpanded && "-rotate-90"
                          )}
                        />
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs">
                          <FolderKanban className="h-4 w-4" />
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
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {project.client?.name || "Interný projekt"} ·{" "}
                            {getActiveTaskLabel(projectTasks.length)}
                          </span>
                        </span>
                      </button>

                      <Link
                        href={`/projects/${project.id}`}
                        aria-label={`Otvoriť projekt ${project.name}`}
                        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
                      >
                        <span className="hidden sm:inline">Otvoriť</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {isExpanded && (
                      <div
                        id={taskContainerId}
                        className="border-t border-border/70 bg-muted/10 pl-3 sm:pl-8"
                      >
                        {projectTasks.map((task) => (
                          <DashboardTaskRow
                            key={task.id}
                            task={task}
                            canUpdate={canUpdateTasks}
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
