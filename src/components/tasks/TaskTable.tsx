"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { FilterX, ListChecks, Loader2, Plus, Search, X } from "lucide-react";

import {
  DashboardTaskRow,
  type DashboardTaskItem,
} from "@/components/dashboard/dashboard-task-row";
import { PageState } from "@/components/layout/page-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/hooks/usePermissions";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatHours } from "@/lib/format";
import { normalizeCurrency } from "@/lib/currency";
import { stripHtml } from "@/lib/utils";
import type { Project, Task } from "@/types/database";

interface TaskTableProps {
  tasks: Task[];
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onOpen?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onCreateTask?: () => void;
  onReorder?: (taskId: string, newIndex: number) => Promise<void>;
  projectId: string;
  project?: Project | null;
  onTaskUpdated?: () => void | Promise<void>;
}

type StatusFilter = "all" | Task["status"];

const statusLabels: Record<StatusFilter, string> = {
  all: "Všetky",
  todo: "Na spracovanie",
  in_progress: "V procese",
  review: "Na kontrole",
  sent_to_client: "U klienta",
  done: "Dokončené",
  invoiced: "Vyfakturované",
  cancelled: "Zrušené",
};

const priorityLabels: Record<string, string> = {
  all: "Všetky priority",
  low: "Nízka priorita",
  medium: "Stredná priorita",
  high: "Vysoká priorita",
  urgent: "Urgentné",
};

const statusSortOrder: Record<Task["status"], number> = {
  todo: 0,
  in_progress: 1,
  review: 2,
  sent_to_client: 3,
  done: 4,
  invoiced: 5,
  cancelled: 6,
};

const prioritySortOrder: Record<Task["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const getTaskCountLabel = (count: number) => {
  if (count === 1) return "1 úloha";
  if (count >= 2 && count <= 4) return `${count} úlohy`;
  return `${count} úloh`;
};

const getSelectedTaskLabel = (count: number) => {
  if (count === 1) return "Vybraná 1 úloha";
  if (count >= 2 && count <= 4) return `Vybrané ${count} úlohy`;
  return `Vybraných ${count} úloh`;
};

const BULK_UPDATE_CONCURRENCY = 6;

const updateTasksInBulk = async (taskIds: string[], updates: Partial<Task>) => {
  for (let index = 0; index < taskIds.length; index += BULK_UPDATE_CONCURRENCY) {
    const batch = taskIds.slice(index, index + BULK_UPDATE_CONCURRENCY);
    await Promise.all(
      batch.map(async (taskId) => {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Nepodarilo sa aktualizovať vybrané úlohy");
        }
      })
    );
  }
};

export function TaskTable({
  tasks,
  onUpdate,
  onDelete,
  onOpen,
  onEdit,
  onCreateTask,
  onReorder,
  projectId,
  project,
  onTaskUpdated,
}: TaskTableProps) {
  const { hasPermission: canViewPrices } = usePermission("financial", "view_prices");
  const { hasPermission: canUpdateTasks } = usePermission("tasks", "update");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const bulkUpdateInFlightRef = useRef(false);

  useEffect(() => {
    const currentTaskIds = new Set(tasks.map((task) => task.id));
    setSelectedTaskIds((previousSelection) => {
      const nextSelection = new Set(
        Array.from(previousSelection).filter((taskId) => currentTaskIds.has(taskId))
      );

      if (
        nextSelection.size === previousSelection.size &&
        Array.from(nextSelection).every((taskId) => previousSelection.has(taskId))
      ) {
        return previousSelection;
      }

      return nextSelection;
    });
  }, [tasks]);

  const statusCounts = useMemo(() => {
    const counts = new Map<Task["status"], number>();
    tasks.forEach((task) => counts.set(task.status, (counts.get(task.status) || 0) + 1));
    return counts;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("sk");

    return tasks
      .filter((task) => {
        const searchableText =
          `${stripHtml(task.title)} ${stripHtml(task.description || "")}`.toLocaleLowerCase("sk");
        const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((firstTask, secondTask) => {
        const statusDifference =
          statusSortOrder[firstTask.status] - statusSortOrder[secondTask.status];

        if (statusDifference !== 0) return statusDifference;

        return prioritySortOrder[firstTask.priority] - prioritySortOrder[secondTask.priority];
      });
  }, [priorityFilter, searchQuery, statusFilter, tasks]);

  const toDashboardTask = (task: Task): DashboardTaskItem => {
    const taskProject = task.project || project;

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      start_date: task.start_date || null,
      due_date: task.due_date,
      estimated_hours: task.estimated_hours || null,
      actual_hours: task.actual_hours || null,
      budget_cents: task.budget_cents || null,
      currency: task.currency || taskProject?.currency || null,
      color: task.color || null,
      project_id: task.project_id || projectId,
      project: taskProject
        ? {
            id: taskProject.id,
            name: taskProject.name,
            code: taskProject.code || "",
            color: taskProject.color,
            currency: taskProject.currency,
          }
        : null,
      assignees: (task.assignees || []).map((assignee) => ({
        id: assignee.id,
        user_id: assignee.user_id,
        user: {
          id: assignee.user_id,
          name: assignee.display_name || assignee.email || "Používateľ",
          email: assignee.email || "",
        },
      })),
    };
  };

  const handleDrop = async (targetTaskId: string) => {
    if (!draggedTaskId || draggedTaskId === targetTaskId || !onReorder) return;

    const draggedTask = tasks.find((task) => task.id === draggedTaskId);
    const targetTask = tasks.find((task) => task.id === targetTaskId);

    if (
      !draggedTask ||
      !targetTask ||
      draggedTask.status !== targetTask.status ||
      draggedTask.priority !== targetTask.priority
    ) {
      setDraggedTaskId(null);
      return;
    }

    const targetIndex = tasks.findIndex((task) => task.id === targetTaskId);
    if (targetIndex === -1) return;

    await onReorder(draggedTaskId, targetIndex);
    setDraggedTaskId(null);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== "all" || priorityFilter !== "all";
  const estimatedHours = filteredTasks.reduce(
    (total, task) => total + (task.estimated_hours || 0),
    0
  );
  const totalBudget = filteredTasks.reduce(
    (total, task) =>
      total + (task.budget_cents ? task.budget_cents / 100 : task.calculated_price || 0),
    0
  );
  const visibleTaskIds = filteredTasks.map((task) => task.id);
  const selectedCount = selectedTaskIds.size;
  const visibleSelectedCount = visibleTaskIds.filter((taskId) =>
    selectedTaskIds.has(taskId)
  ).length;
  const areAllVisibleTasksSelected =
    visibleTaskIds.length > 0 && visibleSelectedCount === visibleTaskIds.length;
  const isSomeVisibleTaskSelected = visibleSelectedCount > 0 && !areAllVisibleTasksSelected;

  const handleToggleTask = (taskId: string, selected: boolean) => {
    setSelectedTaskIds((previousSelection) => {
      const nextSelection = new Set(previousSelection);
      if (selected) {
        nextSelection.add(taskId);
      } else {
        nextSelection.delete(taskId);
      }
      return nextSelection;
    });
  };

  const handleToggleAllVisible = (selected: boolean) => {
    setSelectedTaskIds((previousSelection) => {
      const nextSelection = new Set(previousSelection);
      visibleTaskIds.forEach((taskId) => {
        if (selected) {
          nextSelection.add(taskId);
        } else {
          nextSelection.delete(taskId);
        }
      });
      return nextSelection;
    });
  };

  const handleBulkUpdate = async (updates: Partial<Task>, successDescription: string) => {
    if (selectedTaskIds.size === 0 || bulkUpdateInFlightRef.current) return;

    bulkUpdateInFlightRef.current = true;
    setIsBulkUpdating(true);
    try {
      await updateTasksInBulk(Array.from(selectedTaskIds), updates);
      await onTaskUpdated?.();
      toast({ title: "Úlohy aktualizované", description: successDescription });
      setSelectedTaskIds(new Set());
    } catch (error) {
      try {
        await onTaskUpdated?.();
      } catch {
        // The original bulk-update error is more useful to the user.
      }
      toast({
        title: "Hromadná úprava zlyhala",
        description:
          error instanceof Error ? error.message : "Nepodarilo sa aktualizovať vybrané úlohy",
        variant: "destructive",
      });
    } finally {
      setBulkStatus("");
      setBulkPriority("");
      setIsBulkUpdating(false);
      bulkUpdateInFlightRef.current = false;
    }
  };

  return (
    <section className="surface-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Úlohy projektu</h2>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {tasks.length}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Status, termíny, riešitelia a čas na jednom mieste.
          </p>
        </div>
        {onCreateTask && (
          <Button size="sm" onClick={onCreateTask}>
            <Plus className="h-4 w-4" />
            Nová úloha
          </Button>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="space-y-2 border-b border-border bg-muted/[0.08] p-2.5 sm:p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Hľadať v úlohách…"
                aria-label="Hľadať v úlohách projektu"
                className="h-9 bg-background pl-9 shadow-none"
              />
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-9 w-full bg-background shadow-none sm:w-[170px]">
                  <SelectValue placeholder="Priorita" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                  }}
                  aria-label="Vymazať filtre"
                  title="Vymazať filtre"
                  className="h-9 w-9 shrink-0 text-muted-foreground"
                >
                  <FilterX className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <Tabs
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <TabsList className="w-max">
                {(Object.keys(statusLabels) as StatusFilter[]).map((status) => (
                  <TabsTrigger key={status} value={status} className="gap-1.5">
                    {statusLabels[status]}
                    {status !== "all" && (statusCounts.get(status) || 0) > 0 && (
                      <span className="rounded bg-muted px-1 py-px text-[9px] font-semibold tabular-nums text-muted-foreground">
                        {statusCounts.get(status)}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <PageState
          compact
          icon={ListChecks}
          title="Projekt zatiaľ nemá úlohy"
          description="Vytvorte prvú úlohu a priraďte jej termín alebo riešiteľa."
          action={
            onCreateTask ? (
              <Button size="sm" onClick={onCreateTask}>
                <Plus className="h-4 w-4" />
                Vytvoriť prvú úlohu
              </Button>
            ) : undefined
          }
          className="rounded-none border-0"
        />
      ) : filteredTasks.length === 0 ? (
        <PageState
          compact
          icon={Search}
          title="Žiadne úlohy nevyhovujú filtrom"
          description="Skúste zmeniť hľadanie, status alebo prioritu."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setPriorityFilter("all");
              }}
            >
              Zobraziť všetky úlohy
            </Button>
          }
          className="rounded-none border-0"
        />
      ) : (
        <div>
          {canUpdateTasks && (
            <div className="flex flex-col gap-2 border-b border-border/70 bg-muted/[0.14] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-foreground sm:min-h-9">
                <Checkbox
                  checked={
                    areAllVisibleTasksSelected
                      ? true
                      : isSomeVisibleTaskSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) => handleToggleAllVisible(checked === true)}
                  aria-label="Vybrať všetky zobrazené úlohy"
                  className="h-[18px] w-[18px] border-muted-foreground/50 data-[state=checked]:border-primary"
                />
                <span>
                  {selectedCount > 0
                    ? getSelectedTaskLabel(selectedCount)
                    : "Vybrať zobrazené úlohy"}
                </span>
              </label>

              {selectedCount > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {isBulkUpdating && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Ukladám…
                    </span>
                  )}
                  <Select
                    value={bulkStatus}
                    onValueChange={(status) => {
                      setBulkStatus(status);
                      void handleBulkUpdate(
                        { status: status as Task["status"] },
                        selectedCount === 1
                          ? "Status bol zmenený v 1 úlohe."
                          : `Status bol zmenený v ${selectedCount} úlohách.`
                      );
                    }}
                    disabled={isBulkUpdating}
                  >
                    <SelectTrigger className="h-9 w-[168px] bg-background text-xs shadow-none">
                      <SelectValue placeholder="Zmeniť status…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(statusLabels) as StatusFilter[])
                        .filter((status): status is Task["status"] => status !== "all")
                        .map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusLabels[status]}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={bulkPriority}
                    onValueChange={(priority) => {
                      setBulkPriority(priority);
                      void handleBulkUpdate(
                        { priority: priority as Task["priority"] },
                        selectedCount === 1
                          ? "Priorita bola zmenená v 1 úlohe."
                          : `Priorita bola zmenená v ${selectedCount} úlohách.`
                      );
                    }}
                    disabled={isBulkUpdating}
                  >
                    <SelectTrigger className="h-9 w-[168px] bg-background text-xs shadow-none">
                      <SelectValue placeholder="Zmeniť prioritu…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels)
                        .filter(([priority]) => priority !== "all")
                        .map(([priority, label]) => (
                          <SelectItem key={priority} value={priority}>
                            {label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedTaskIds(new Set())}
                    disabled={isBulkUpdating}
                    aria-label="Zrušiť výber úloh"
                    title="Zrušiť výber"
                    className="h-9 w-9 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
          {filteredTasks.map((task) => (
            <DashboardTaskRow
              key={task.id}
              task={toDashboardTask(task)}
              canUpdate={canUpdateTasks}
              canViewPrices={canViewPrices}
              showProject={false}
              onUpdate={(taskId, updates) => onUpdate(taskId, updates as Partial<Task>)}
              onTimeTracked={() => onTaskUpdated?.()}
              onOpen={onOpen ? () => onOpen(task) : undefined}
              onEdit={onEdit ? () => onEdit(task) : undefined}
              onDelete={() => onDelete(task.id)}
              draggable={Boolean(onReorder) && !hasActiveFilters}
              isDragging={draggedTaskId === task.id}
              onDragStart={() => setDraggedTaskId(task.id)}
              onDragOver={handleDragOver}
              onDrop={() => void handleDrop(task.id)}
              onDragEnd={() => setDraggedTaskId(null)}
              selected={selectedTaskIds.has(task.id)}
              onSelectedChange={
                canUpdateTasks ? (selected) => handleToggleTask(task.id, selected) : undefined
              }
            />
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <footer className="flex flex-col gap-1.5 border-t border-border/70 bg-muted/[0.08] px-3 py-2.5 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <span>
            Zobrazené {getTaskCountLabel(filteredTasks.length)} z {tasks.length}
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
            <span>Odhad spolu {formatHours(estimatedHours)}</span>
            {canViewPrices && (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalBudget, normalizeCurrency(project?.currency))}
              </span>
            )}
          </div>
        </footer>
      )}
    </section>
  );
}
