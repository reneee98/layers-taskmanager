"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import type { Project, Task } from "@/types/database";

interface ProjectReportGeneratorProps {
  project: Project;
  tasks: Task[];
}

interface ReportOptions {
  showSummary: boolean;
  showTasksTable: boolean;
  showTimeEntries: boolean;
}

export const ProjectReportGenerator = ({ project, tasks }: ProjectReportGeneratorProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(() =>
    tasks.map((task) => task.id),
  );
  const [options, setOptions] = useState<ReportOptions>({
    showSummary: true,
    showTasksTable: true,
    showTimeEntries: true,
  });

  const visibleTasks = tasks;
  const selectedTaskIdSet = new Set(selectedTaskIds);
  const selectedVisibleTaskCount = visibleTasks.filter((task) =>
    selectedTaskIdSet.has(task.id),
  ).length;
  const areAllVisibleTasksSelected =
    visibleTasks.length > 0 && selectedVisibleTaskCount === visibleTasks.length;
  const areSomeVisibleTasksSelected =
    selectedVisibleTaskCount > 0 && !areAllVisibleTasksSelected;

  const handleTaskSelectionChange = (taskId: string, selected: boolean) => {
    setSelectedTaskIds((currentTaskIds) => {
      if (selected) {
        return currentTaskIds.includes(taskId)
          ? currentTaskIds
          : [...currentTaskIds, taskId];
      }

      return currentTaskIds.filter((currentTaskId) => currentTaskId !== taskId);
    });
  };

  const handleToggleAllVisibleTasks = (selected: boolean) => {
    const visibleTaskIds = new Set(visibleTasks.map((task) => task.id));

    setSelectedTaskIds((currentTaskIds) => {
      if (!selected) {
        return currentTaskIds.filter((taskId) => !visibleTaskIds.has(taskId));
      }

      return Array.from(
        new Set([...currentTaskIds, ...visibleTasks.map((task) => task.id)]),
      );
    });
  };

  const handleOpenReport = () => {
    const params = new URLSearchParams();
    params.set("onlyDone", "false");
    params.set("showSummary", options.showSummary ? "true" : "false");
    params.set("showTasksTable", options.showTasksTable ? "true" : "false");
    params.set("showTimeEntries", options.showTimeEntries ? "true" : "false");
    params.set("taskIds", selectedTaskIds.join(","));
    
    router.push(`/projects/${project.id}/report?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Zobraziť report
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nastavenia reportu</DialogTitle>
            <DialogDescription>
              Vyberte, čo chcete zobraziť v reporte
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showSummary"
                checked={options.showSummary}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, showSummary: checked === true })
                }
              />
              <Label
                htmlFor="showSummary"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Zobraziť summary karty
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showTasksTable"
                checked={options.showTasksTable}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, showTasksTable: checked === true })
                }
              />
              <Label
                htmlFor="showTasksTable"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Zobraziť tabuľku úloh
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showTimeEntries"
                checked={options.showTimeEntries}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, showTimeEntries: checked === true })
                }
              />
              <Label
                htmlFor="showTimeEntries"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Zobraziť detailné časové záznamy
              </Label>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Úlohy v reporte</p>
                  <p className="text-xs text-muted-foreground">
                    Vybrané {selectedVisibleTaskCount} z {visibleTasks.length}
                  </p>
                </div>
                {visibleTasks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="selectAllReportTasks"
                      checked={
                        areAllVisibleTasksSelected
                          ? true
                          : areSomeVisibleTasksSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        handleToggleAllVisibleTasks(checked === true)
                      }
                    />
                    <Label
                      htmlFor="selectAllReportTasks"
                      className="cursor-pointer text-xs font-medium"
                    >
                      Vybrať všetky
                    </Label>
                  </div>
                )}
              </div>

              {visibleTasks.length > 0 ? (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {visibleTasks.map((task) => (
                    <Label
                      key={task.id}
                      htmlFor={`report-task-${task.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-normal transition-colors hover:bg-muted/60"
                    >
                      <Checkbox
                        id={`report-task-${task.id}`}
                        checked={selectedTaskIdSet.has(task.id)}
                        onCheckedChange={(checked) =>
                          handleTaskSelectionChange(task.id, checked === true)
                        }
                      />
                      <span className="min-w-0 flex-1 truncate">{task.title}</span>
                    </Label>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                  Projekt nemá žiadne úlohy.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Zrušiť
            </Button>
            <Button
              onClick={handleOpenReport}
              disabled={selectedVisibleTaskCount === 0}
            >
              Zobraziť report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
