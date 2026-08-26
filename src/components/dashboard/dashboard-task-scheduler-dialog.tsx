"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { sk } from "date-fns/locale";
import { CalendarPlus, Clock3, Loader2, Search, UserRound } from "lucide-react";

import type { DashboardTaskItem } from "@/components/dashboard/dashboard-task-row";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { formatHours } from "@/lib/format";
import { stripHtml } from "@/lib/utils";
import { projectColorToRgba, resolveProjectColor } from "@/lib/project-colors";
import { resolveTaskColor, taskColorToRgba } from "@/lib/task-colors";

interface DashboardTaskSchedulerDialogProps {
  open: boolean;
  dueDate: string | null;
  tasks: DashboardTaskItem[];
  onOpenChange: (open: boolean) => void;
  onSchedule: (taskId: string, startDate: string, dueDate: string) => Promise<void>;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getAssigneeNames = (task: DashboardTaskItem) =>
  (task.assignees || []).map(
    (assignee) => assignee.user?.name || assignee.user?.email || "Používateľ"
  );

export const DashboardTaskSchedulerDialog = ({
  open,
  dueDate,
  tasks,
  onOpenChange,
  onSchedule,
}: DashboardTaskSchedulerDialogProps) => {
  const [query, setQuery] = useState("");
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(dueDate);
  const [endDate, setEndDate] = useState<string | null>(dueDate);

  useEffect(() => {
    if (!open || !dueDate) return;
    setStartDate(dueDate);
    setEndDate(dueDate);
  }, [dueDate, open]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("sk");
    if (!normalizedQuery) return tasks;

    return tasks.filter((task) => {
      const searchableText = [
        stripHtml(task.title),
        task.project?.name,
        task.project?.code,
        ...getAssigneeNames(task),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("sk");

      return searchableText.includes(normalizedQuery);
    });
  }, [query, tasks]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (schedulingTaskId) return;
    onOpenChange(nextOpen);
    if (!nextOpen) setQuery("");
  };

  const handleSchedule = async (taskId: string) => {
    if (!startDate || !endDate || schedulingTaskId) return;

    setSchedulingTaskId(taskId);
    try {
      await onSchedule(taskId, startDate, endDate);
      onOpenChange(false);
      setQuery("");
    } finally {
      setSchedulingTaskId(null);
    }
  };

  const formattedDateRange =
    startDate && endDate
      ? `${format(parseISO(startDate), "d. MMM", { locale: sk })} – ${format(parseISO(endDate), "d. MMM", { locale: sk })}`
      : "vybraný rozsah";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-5 pb-4 pt-5 pr-12">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/[0.07] text-sky-600 dark:text-sky-400">
              <CalendarPlus className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>Naplánovať existujúcu úlohu</DialogTitle>
              <DialogDescription className="mt-1">
                Vyberte úlohu bez termínu pre obdobie {formattedDateRange}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-end">
          <div className="shrink-0 space-y-1.5">
            <p className="text-[11px] font-medium text-foreground">Termín od – do</p>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              placeholder="Vybrať rozsah"
              className="h-10 min-w-[150px] justify-center rounded-lg bg-card px-3 shadow-none"
              onSave={async (nextStartDate, nextEndDate) => {
                setStartDate(nextStartDate);
                setEndDate(nextEndDate || nextStartDate);
              }}
            />
          </div>
          <div className="relative flex-1">
            <p className="mb-1.5 text-[11px] font-medium text-foreground">Existujúca úloha</p>
            <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hľadať úlohu, projekt alebo človeka..."
              aria-label="Hľadať existujúcu úlohu"
              className="h-10 pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {filteredTasks.length > 0 ? (
            <div className="space-y-1">
              {filteredTasks.map((task) => {
                const assigneeNames = getAssigneeNames(task);
                const remainingHours = Math.max(
                  (task.estimated_hours || 0) - (task.actual_hours || 0),
                  0
                );
                const isScheduling = schedulingTaskId === task.id;
                const projectColor = resolveProjectColor(task.project);
                const taskColor = resolveTaskColor(task);

                return (
                  <button
                    key={task.id}
                    type="button"
                    disabled={schedulingTaskId !== null}
                    onClick={() => handleSchedule(task.id)}
                    style={
                      taskColor
                        ? {
                            boxShadow: `inset 3px 0 0 ${taskColor}`,
                            backgroundImage: `linear-gradient(90deg, ${taskColorToRgba(
                              taskColor,
                              0.07
                            )}, transparent 240px)`,
                          }
                        : undefined
                    }
                    className="group flex min-h-16 w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left outline-none transition-colors hover:border-border hover:bg-muted/55 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground group-hover:text-foreground">
                      {isScheduling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarPlus className="h-4 w-4" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {stripHtml(task.title)}
                      </span>
                      <span className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                        <span
                          className="truncate rounded px-1 py-px font-mono font-medium text-foreground"
                          style={
                            projectColor
                              ? {
                                  backgroundColor: projectColorToRgba(projectColor, 0.045),
                                }
                              : undefined
                          }
                        >
                          {task.project?.code || task.project?.name || "Bez projektu"}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="flex shrink-0 items-center gap-1 tabular-nums">
                          <Clock3 className="h-3 w-3" />
                          {(task.estimated_hours || 0) > 0
                            ? `${formatHours(remainingHours)} ostáva`
                            : "bez odhadu"}
                        </span>
                      </span>
                    </span>

                    <span className="flex max-w-32 shrink-0 items-center gap-1.5">
                      {assigneeNames.length > 0 ? (
                        <>
                          <Avatar className="h-6 w-6 border border-border">
                            <AvatarFallback className="text-[9px]">
                              {getInitials(assigneeNames[0])}
                            </AvatarFallback>
                          </Avatar>
                          <span className="hidden truncate text-[10px] text-muted-foreground sm:block">
                            {assigneeNames[0]}
                            {assigneeNames.length > 1 ? ` +${assigneeNames.length - 1}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <UserRound className="h-3.5 w-3.5" />
                          Nepriradené
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
              <CalendarPlus className="mb-3 h-7 w-7 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                {query ? "Žiadna úloha nezodpovedá hľadaniu" : "Žiadne úlohy bez termínu"}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                {query
                  ? "Skúste zmeniť hľadaný názov, projekt alebo človeka."
                  : "Pre tento filter už majú všetky existujúce úlohy nastavený termín."}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
