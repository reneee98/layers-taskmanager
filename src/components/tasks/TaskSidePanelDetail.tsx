"use client";

import dynamic from "next/dynamic";
import type { FormEventHandler, ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import type { Project, Task } from "@/types/database";

const PanelSkeleton = () => (
  <div className="space-y-3 p-5 sm:p-6">
    <div className="h-28 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
    <div className="h-44 animate-pulse rounded-xl border border-border/70 bg-muted/30" />
  </div>
);

const TaskChecklist = dynamic(
  () =>
    import("@/components/tasks/TaskChecklist").then((module) => ({
      default: module.TaskChecklist,
    })),
  { loading: PanelSkeleton }
);

const TaskTimeTab = dynamic(
  () =>
    import("@/components/tasks/TaskTimeTab").then((module) => ({
      default: module.TaskTimeTab,
    })),
  { loading: PanelSkeleton }
);

const TaskFinancePanel = dynamic(
  () =>
    import("@/components/finance/TaskFinancePanel").then((module) => ({
      default: module.TaskFinancePanel,
    })),
  { loading: PanelSkeleton }
);

const TaskFilesGrid = dynamic(
  () =>
    import("@/components/tasks/TaskFilesGrid").then((module) => ({
      default: module.TaskFilesGrid,
    })),
  { loading: PanelSkeleton }
);

const TaskSettingsPanel = dynamic(
  () =>
    import("@/components/tasks/TaskSettingsPanel").then((module) => ({
      default: module.TaskSettingsPanel,
    })),
  { loading: PanelSkeleton }
);

const ProjectStatusCard = dynamic(
  () =>
    import("@/components/projects/ProjectStatusCard").then((module) => ({
      default: module.ProjectStatusCard,
    })),
  { loading: PanelSkeleton }
);

const ProjectQuickLinksSection = dynamic(
  () =>
    import("@/components/projects/ProjectQuickLinksSection").then((module) => ({
      default: module.ProjectQuickLinksSection,
    })),
  { loading: PanelSkeleton }
);

type TaskWithSettings = Task & {
  sales_commission_enabled?: boolean;
  sales_commission_user_id?: string | null;
  sales_commission_percent?: number | null;
};

interface TaskSidePanelDetailProps {
  task: TaskWithSettings;
  projects: Project[];
  editor: ReactNode;
  isSaving: boolean;
  canSave: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  onTaskUpdate: () => void;
}

export const TaskSidePanelDetail = ({
  task,
  projects,
  editor,
  isSaving,
  canSave,
  onSubmit,
  onClose,
  onTaskUpdate,
}: TaskSidePanelDetailProps) => {
  const [activeTab, setActiveTab] = useState("work");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border/70 bg-card px-4 py-3 sm:px-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border border-border bg-muted/30 p-1 [&>*]:shrink-0">
          <TabsTrigger value="work">Práca</TabsTrigger>
          <TabsTrigger value="time" className="gap-1.5">
            Čas a rozpočet
            {task.actual_hours != null && task.actual_hours > 0 ? (
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                {task.actual_hours.toFixed(1)} h
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="files">Podklady</TabsTrigger>
          <TabsTrigger value="settings">Nastavenia</TabsTrigger>
        </TabsList>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/[0.08]">
        <TabsContent value="work" className="m-0">
          <form id="task-side-panel-form" onSubmit={onSubmit} aria-busy={isSaving}>
            {editor}
          </form>

          <div className="p-5 sm:p-6">
            <TaskChecklist taskId={task.id} />
          </div>
        </TabsContent>

        <TabsContent value="time" className="m-0 space-y-5 p-5 sm:p-6">
          {task.project_id ? (
            <ProjectStatusCard projectId={task.project_id} taskId={task.id} />
          ) : null}
          <TaskTimeTab
            taskId={task.id}
            projectId={task.project_id || ""}
            onTimeEntryAdded={() => {
              onTaskUpdate();
              window.dispatchEvent(new CustomEvent("timeEntryAdded"));
            }}
          />
          <TaskFinancePanel taskId={task.id} />
        </TabsContent>

        <TabsContent value="files" className="m-0 space-y-5 p-5 sm:p-6">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold">Súbory a podklady</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Nahrané dokumenty, obrázky a pracovné súbory.
              </p>
            </div>
            <div className="p-5">
              <TaskFilesGrid taskId={task.id} />
            </div>
          </section>
          <ProjectQuickLinksSection taskId={task.id} />
        </TabsContent>

        <TabsContent value="settings" className="m-0 p-5 sm:p-6">
          <TaskSettingsPanel
            taskId={task.id}
            task={{
              id: task.id,
              title: task.title,
              project_id: task.project_id || null,
              color: task.color || null,
              currency: task.currency || "EUR",
              budget_cents: task.budget_cents || null,
              sales_commission_enabled: task.sales_commission_enabled,
              sales_commission_user_id: task.sales_commission_user_id || null,
              sales_commission_percent: task.sales_commission_percent || null,
            }}
            projects={projects}
            onTaskUpdate={onTaskUpdate}
          />
        </TabsContent>
      </div>

      {activeTab === "work" ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-border/70 bg-card px-5 py-4 sm:px-6">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Zavrieť
          </Button>
          <Button
            type="submit"
            form="task-side-panel-form"
            disabled={isSaving || !canSave}
            className="ml-auto min-w-36 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" />
                Ukladám…
              </>
            ) : (
              "Uložiť zmeny"
            )}
          </Button>
        </div>
      ) : null}
    </Tabs>
  );
};
