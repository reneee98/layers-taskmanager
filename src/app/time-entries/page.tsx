"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  isSameWeek,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { sk } from "date-fns/locale";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FilterX,
  ListTodo,
  PanelRightOpen,
  Search,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { DataToolbar } from "@/components/layout/data-toolbar";
import { MetricStrip } from "@/components/layout/metric-strip";
import { PageHeader } from "@/components/layout/page-header";
import { PageState } from "@/components/layout/page-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { usePermission } from "@/hooks/usePermissions";
import { toast } from "@/hooks/use-toast";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/database";

const TaskDialog = dynamic(
  () => import("@/components/tasks/TaskDialog").then((module) => ({ default: module.TaskDialog })),
  { loading: () => null, ssr: false }
);

interface TimeEntry {
  id: string;
  hours: number;
  date: string;
  description: string | null;
  is_billable: boolean;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  tasks: {
    id: string;
    title: string;
    project_id: string | null;
    projects: {
      id: string;
      name: string;
      code: string | null;
      color: string | null;
    } | null;
  } | null;
  profiles: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
}

type BillableFilter = "all" | "billable" | "non-billable";

interface TaskTimeGroup {
  key: string;
  task: TimeEntry["tasks"];
  entries: TimeEntry[];
  totalHours: number;
  userCount: number;
}

const formatTime = (value: string | null) => {
  if (!value) return null;

  const timeOnlyMatch = value.match(/^(\d{1,2}):(\d{2})/);
  if (timeOnlyMatch && !value.includes("T")) {
    return `${timeOnlyMatch[1].padStart(2, "0")}:${timeOnlyMatch[2]}`;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format(date, "HH:mm", { locale: sk });
};

const getProfileName = (entry: TimeEntry) =>
  entry.profiles?.display_name || entry.profiles?.email || "Neznámy používateľ";

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getCountLabel = (count: number, singular: string, few: string, many: string) => {
  if (count === 1) return singular;
  if (count >= 2 && count <= 4) return few;
  return many;
};

const TimeEntriesPageContent = () => {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { hasPermission: canViewTimeEntries, isLoading: permissionLoading } = usePermission(
    "pages",
    "view_time_entries"
  );
  const { hasPermission: canDeleteTimeEntries } = usePermission("time_entries", "delete");
  const workspaceId = workspace?.id;

  const [selectedWeek, setSelectedWeek] = useState(() => new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [billableFilter, setBillableFilter] = useState<BillableFilter>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [isTaskPanelLoading, setIsTaskPanelLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const taskPanelRequestRef = useRef(0);

  const weekStart = useMemo(() => startOfWeek(selectedWeek, { weekStartsOn: 1 }), [selectedWeek]);
  const weekEnd = useMemo(() => endOfWeek(selectedWeek, { weekStartsOn: 1 }), [selectedWeek]);

  const fetchTimeEntries = useCallback(async () => {
    if (!workspaceId || !canViewTimeEntries) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        date_from: format(weekStart, "yyyy-MM-dd"),
        date_to: format(weekEnd, "yyyy-MM-dd"),
      });
      const response = await fetch(`/api/time-entries?${params}`, { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Nepodarilo sa načítať časové záznamy");
      }

      setTimeEntries(result.data || []);
    } catch (fetchError) {
      console.error("Error fetching time entries:", fetchError);
      setError(
        fetchError instanceof Error ? fetchError.message : "Nepodarilo sa načítať časové záznamy"
      );
    } finally {
      setLoading(false);
    }
  }, [canViewTimeEntries, weekEnd, weekStart, workspaceId]);

  useEffect(() => {
    if (workspaceLoading || permissionLoading || !workspaceId || !canViewTimeEntries) return;
    void fetchTimeEntries();
  }, [canViewTimeEntries, fetchTimeEntries, permissionLoading, workspaceId, workspaceLoading]);

  useEffect(() => {
    const handleRefresh = () => void fetchTimeEntries();
    window.addEventListener("timeEntryAdded", handleRefresh);
    return () => window.removeEventListener("timeEntryAdded", handleRefresh);
  }, [fetchTimeEntries]);

  const users = useMemo(() => {
    const uniqueUsers = new Map<string, string>();
    timeEntries.forEach((entry) => {
      if (entry.profiles?.id) uniqueUsers.set(entry.profiles.id, getProfileName(entry));
    });
    return Array.from(uniqueUsers, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "sk")
    );
  }, [timeEntries]);

  const projects = useMemo(() => {
    const uniqueProjects = new Map<string, string>();
    timeEntries.forEach((entry) => {
      const project = entry.tasks?.projects;
      if (project) uniqueProjects.set(project.id, project.name);
    });
    return Array.from(uniqueProjects, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "sk")
    );
  }, [timeEntries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("sk");

    return timeEntries.filter((entry) => {
      const matchesUser = userFilter === "all" || entry.profiles?.id === userFilter;
      const matchesProject = projectFilter === "all" || entry.tasks?.projects?.id === projectFilter;
      const matchesBillable =
        billableFilter === "all" ||
        (billableFilter === "billable" ? entry.is_billable : !entry.is_billable);
      const searchableText = [
        entry.description,
        entry.tasks?.title,
        entry.tasks?.projects?.name,
        entry.tasks?.projects?.code,
        getProfileName(entry),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("sk");

      return (
        matchesUser &&
        matchesProject &&
        matchesBillable &&
        (!normalizedQuery || searchableText.includes(normalizedQuery))
      );
    });
  }, [billableFilter, projectFilter, searchQuery, timeEntries, userFilter]);

  const groupedEntries = useMemo(() => {
    const dayGroups = new Map<string, Map<string, TimeEntry[]>>();

    filteredEntries.forEach((entry) => {
      const taskKey = entry.tasks?.id || "without-task";
      const taskGroups = dayGroups.get(entry.date) || new Map<string, TimeEntry[]>();
      const entries = taskGroups.get(taskKey) || [];
      entries.push(entry);
      taskGroups.set(taskKey, entries);
      dayGroups.set(entry.date, taskGroups);
    });

    return Array.from(dayGroups.entries())
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([dateKey, taskGroups]) => {
        const groups: TaskTimeGroup[] = Array.from(taskGroups.entries())
          .map(([taskKey, entries]) => ({
            key: `${dateKey}:${taskKey}`,
            task: entries[0]?.tasks || null,
            entries,
            totalHours: entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0),
            userCount: new Set(entries.map((entry) => entry.profiles?.id).filter(Boolean)).size,
          }))
          .sort((a, b) =>
            (a.task?.title || "Bez úlohy").localeCompare(b.task?.title || "Bez úlohy", "sk")
          );

        return [dateKey, groups] as const;
      });
  }, [filteredEntries]);

  const dailyTotals = useMemo(() => {
    const totals = new Map<string, number>();
    filteredEntries.forEach((entry) => {
      totals.set(entry.date, (totals.get(entry.date) || 0) + Number(entry.hours || 0));
    });
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const key = format(date, "yyyy-MM-dd");
      return { date, key, hours: totals.get(key) || 0 };
    });
  }, [filteredEntries, weekStart]);

  const totalHours = filteredEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
  const billableHours = filteredEntries
    .filter((entry) => entry.is_billable)
    .reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
  const trackedUsers = new Set(filteredEntries.map((entry) => entry.profiles?.id).filter(Boolean))
    .size;
  const maxDailyHours = Math.max(...dailyTotals.map((day) => day.hours), 1);
  const hasFilters =
    Boolean(searchQuery) ||
    userFilter !== "all" ||
    projectFilter !== "all" ||
    billableFilter !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setUserFilter("all");
    setProjectFilter("all");
    setBillableFilter("all");
  };

  const handleToggleGroup = (groupKey: string) => {
    setExpandedGroups((currentGroups) => {
      const nextGroups = new Set(currentGroups);
      if (nextGroups.has(groupKey)) {
        nextGroups.delete(groupKey);
      } else {
        nextGroups.add(groupKey);
      }
      return nextGroups;
    });
  };

  const handleOpenTaskPanel = async (taskId: string) => {
    const requestId = taskPanelRequestRef.current + 1;
    taskPanelRequestRef.current = requestId;
    setSelectedTask(null);
    setIsTaskPanelLoading(true);
    setIsTaskPanelOpen(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Nepodarilo sa načítať úlohu");
      }

      if (taskPanelRequestRef.current === requestId) {
        setSelectedTask(result.data);
      }
    } catch (taskError) {
      if (taskPanelRequestRef.current !== requestId) return;

      setIsTaskPanelOpen(false);
      toast({
        title: "Úlohu sa nepodarilo otvoriť",
        description: taskError instanceof Error ? taskError.message : undefined,
        variant: "destructive",
      });
    } finally {
      if (taskPanelRequestRef.current === requestId) {
        setIsTaskPanelLoading(false);
      }
    }
  };

  const handleTaskPanelOpenChange = (open: boolean) => {
    setIsTaskPanelOpen(open);
    if (!open) {
      taskPanelRequestRef.current += 1;
      setSelectedTask(null);
      setIsTaskPanelLoading(false);
    }
  };

  const handleDeleteTimeEntry = async (id: string) => {
    if (!window.confirm("Naozaj chcete vymazať tento časový záznam?")) return;

    try {
      const response = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Časový záznam sa nepodarilo vymazať");
      }

      setTimeEntries((entries) => entries.filter((entry) => entry.id !== id));
      toast({ title: "Časový záznam bol vymazaný" });
    } catch (deleteError) {
      toast({
        title: "Záznam sa nepodarilo vymazať",
        description: deleteError instanceof Error ? deleteError.message : undefined,
        variant: "destructive",
      });
    }
  };

  if (workspaceLoading || permissionLoading) {
    return <PageState variant="loading" title="Načítavam časy" />;
  }

  if (!canViewTimeEntries) {
    return (
      <PageState
        variant="permission"
        title="Nemáte prístup k časom"
        description="Požiadajte správcu workspace o oprávnenie na zobrazenie časových záznamov."
      />
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Časy"
        description="Prehľad odpracovaného času podľa dní, ľudí, projektov a úloh."
        icon={Clock3}
        actions={
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Predchádzajúci týždeň"
              className="h-8 w-8"
              onClick={() => setSelectedWeek((date) => addWeeks(date, -1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              className="h-8 min-w-[170px] px-3 text-xs"
              onClick={() => setSelectedWeek(new Date())}
            >
              <CalendarDays />
              {format(weekStart, "d. MMM", { locale: sk })} –{" "}
              {format(weekEnd, "d. MMM yyyy", { locale: sk })}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Nasledujúci týždeň"
              className="h-8 w-8"
              onClick={() => setSelectedWeek((date) => addWeeks(date, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        }
      />

      <MetricStrip
        items={[
          { label: "Spolu tento týždeň", value: formatHours(totalHours), icon: Clock3 },
          {
            label: "Fakturovateľný čas",
            value: formatHours(billableHours),
            icon: CircleDollarSign,
          },
          { label: "Zapojení ľudia", value: trackedUsers, icon: UsersRound },
          { label: "Časové záznamy", value: filteredEntries.length, icon: CheckCircle2 },
        ]}
      />

      <section className="surface-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Aktivita v týždni</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Denné rozloženie vykázaného času</p>
          </div>
          {isSameWeek(selectedWeek, new Date(), { weekStartsOn: 1 }) && (
            <Badge variant="secondary">Aktuálny týždeň</Badge>
          )}
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {dailyTotals.map((day) => (
            <div key={day.key} className="min-w-0">
              <div className="flex h-16 items-end overflow-hidden rounded-lg bg-muted/45">
                <div
                  className={cn(
                    "w-full rounded-lg bg-primary/70 transition-[height] duration-300",
                    day.hours === 0 && "bg-border/60"
                  )}
                  style={{
                    height:
                      day.hours === 0 ? 3 : `${Math.max(12, (day.hours / maxDailyHours) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-center">
                <div
                  className={cn(
                    "text-[11px] font-medium capitalize text-muted-foreground",
                    isToday(day.date) && "text-primary"
                  )}
                >
                  {format(day.date, "EEE", { locale: sk })}
                </div>
                <div className="mt-0.5 truncate text-xs font-semibold tabular-nums text-foreground">
                  {day.hours ? formatHours(day.hours) : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <DataToolbar className="sm:flex-col sm:items-stretch sm:justify-start lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Hľadať úlohu, popis alebo projekt…"
            aria-label="Hľadať v časových záznamoch"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="lg:w-[170px]" aria-label="Filtrovať podľa človeka">
              <SelectValue placeholder="Všetci ľudia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetci ľudia</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="lg:w-[180px]" aria-label="Filtrovať podľa projektu">
              <SelectValue placeholder="Všetky projekty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky projekty</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={billableFilter}
            onValueChange={(value) => setBillableFilter(value as BillableFilter)}
          >
            <SelectTrigger className="lg:w-[165px]" aria-label="Filtrovať fakturovateľnosť">
              <SelectValue placeholder="Všetky záznamy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky záznamy</SelectItem>
              <SelectItem value="billable">Fakturovateľné</SelectItem>
              <SelectItem value="non-billable">Nefakturovateľné</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zrušiť filtre"
              onClick={handleClearFilters}
            >
              <FilterX />
            </Button>
          )}
        </div>
      </DataToolbar>

      {loading ? (
        <PageState variant="loading" title="Načítavam časové záznamy" />
      ) : error ? (
        <PageState
          variant="error"
          title="Časy sa nepodarilo načítať"
          description={error}
          action={
            <Button variant="outline" onClick={() => void fetchTimeEntries()}>
              Skúsiť znova
            </Button>
          }
        />
      ) : groupedEntries.length === 0 ? (
        <PageState
          icon={Clock3}
          title={
            hasFilters
              ? "Žiadne záznamy nezodpovedajú filtrom"
              : "V tomto týždni nie je vykázaný čas"
          }
          description={
            hasFilters
              ? "Skúste upraviť alebo zrušiť aktívne filtre."
              : "Po spustení časovača alebo ručnom zapísaní času sa záznamy zobrazia tu."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={handleClearFilters}>
                Zrušiť filtre
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {groupedEntries.map(([dateKey, taskGroups]) => {
            const day = parseISO(dateKey);
            const dayTotal = taskGroups.reduce((sum, group) => sum + group.totalHours, 0);

            return (
              <section key={dateKey} className="surface-panel overflow-hidden">
                <header className="flex items-center justify-between border-b border-border bg-muted/[0.16] px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h2 className="text-sm font-semibold capitalize text-foreground">
                      {isToday(day) ? "Dnes" : format(day, "EEEE", { locale: sk })}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {format(day, "d. MMMM yyyy", { locale: sk })}
                    </span>
                  </div>
                  <div className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatHours(dayTotal)}
                  </div>
                </header>

                <div className="divide-y divide-border">
                  {taskGroups.map((group) => {
                    const task = group.task;
                    const project = task?.projects;
                    const isExpanded = expandedGroups.has(group.key);
                    const detailId = `time-group-${group.key}`;

                    return (
                      <div key={group.key}>
                        <div className="group/row flex items-stretch transition-colors hover:bg-muted/25">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={detailId}
                            onClick={() => handleToggleGroup(group.key)}
                            className="group/summary grid min-h-14 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30 sm:pl-5 md:grid-cols-[minmax(220px,1.4fr)_minmax(160px,1fr)_auto_auto]"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/45 text-muted-foreground">
                                <ListTodo className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div
                                  className="truncate text-sm font-semibold text-foreground"
                                  title={task?.title || "Bez úlohy"}
                                >
                                  {task?.title || "Bez úlohy"}
                                </div>
                                <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground md:hidden">
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground"
                                    style={
                                      project?.color
                                        ? { backgroundColor: project.color }
                                        : undefined
                                    }
                                  />
                                  <span className="truncate">
                                    {project?.name || "Bez projektu"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="hidden min-w-0 items-center gap-2 text-xs text-muted-foreground md:flex">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground"
                                style={
                                  project?.color ? { backgroundColor: project.color } : undefined
                                }
                              />
                              <span className="truncate">
                                {project?.name || "Bez projektu"}
                                {project?.code ? ` · ${project.code}` : ""}
                              </span>
                            </div>

                            <div className="hidden items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground md:flex">
                              <UsersRound className="h-3.5 w-3.5" />
                              {group.userCount}{" "}
                              {getCountLabel(group.userCount, "človek", "ľudia", "ľudí")}
                              <span aria-hidden="true">·</span>
                              {group.entries.length}{" "}
                              {getCountLabel(group.entries.length, "záznam", "záznamy", "záznamov")}
                            </div>

                            <div className="flex items-center justify-end gap-3">
                              <span className="text-sm font-semibold tabular-nums text-foreground">
                                {formatHours(group.totalHours)}
                              </span>
                              <ChevronRight
                                className={cn(
                                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                  isExpanded && "rotate-90"
                                )}
                              />
                            </div>
                          </button>

                          {task && (
                            <button
                              type="button"
                              aria-label={`Otvoriť úlohu ${task.title}`}
                              title="Otvoriť úlohu v bočnom paneli"
                              onClick={() => void handleOpenTaskPanel(task.id)}
                              className="flex w-11 shrink-0 items-center justify-center border-l border-border/70 text-muted-foreground opacity-100 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30 md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100"
                            >
                              <PanelRightOpen className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div
                            id={detailId}
                            className="divide-y divide-border border-t border-border bg-muted/[0.1]"
                          >
                            {group.entries.map((entry) => {
                              const profileName = getProfileName(entry);
                              const startTime = formatTime(entry.start_time);
                              const endTime = formatTime(entry.end_time);

                              return (
                                <div
                                  key={entry.id}
                                  className="group/detail grid gap-3 px-4 py-3 sm:px-5 md:grid-cols-[minmax(200px,1fr)_minmax(130px,.6fr)_110px_76px] md:items-center md:pl-16"
                                >
                                  <div className="min-w-0">
                                    <div
                                      className="truncate text-sm text-foreground"
                                      title={entry.description || undefined}
                                    >
                                      {entry.description || "Bez popisu"}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-muted-foreground md:hidden">
                                      Popis záznamu
                                    </div>
                                  </div>

                                  <div className="flex min-w-0 items-center gap-2">
                                    <Avatar className="h-7 w-7">
                                      <AvatarFallback className="text-[10px]">
                                        {getInitials(profileName) || (
                                          <UserRound className="h-3 w-3" />
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span
                                      className="truncate text-xs text-foreground"
                                      title={profileName}
                                    >
                                      {profileName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {startTime && endTime ? `${startTime} – ${endTime}` : "Ručne"}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 md:justify-end">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "h-1.5 w-1.5 rounded-full",
                                          entry.is_billable
                                            ? "bg-emerald-500"
                                            : "bg-muted-foreground/40"
                                        )}
                                        title={
                                          entry.is_billable ? "Fakturovateľné" : "Nefakturovateľné"
                                        }
                                      />
                                      <span className="text-sm font-medium tabular-nums text-foreground">
                                        {formatHours(entry.hours)}
                                      </span>
                                    </div>
                                    {canDeleteTimeEntries && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Odstrániť časový záznam"
                                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover/detail:opacity-100 md:focus-visible:opacity-100"
                                        onClick={() => void handleDeleteTimeEntry(entry.id)}
                                      >
                                        <Trash2 />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <TaskDialog
        projectId={selectedTask?.project_id || null}
        task={selectedTask}
        mode="quick"
        loadingTask={isTaskPanelLoading}
        open={isTaskPanelOpen}
        onOpenChange={handleTaskPanelOpenChange}
        onSuccess={() => void fetchTimeEntries()}
      />
    </div>
  );
};

export default function TimeEntriesPage() {
  return (
    <AuthGuard>
      <TimeEntriesPageContent />
    </AuthGuard>
  );
}
