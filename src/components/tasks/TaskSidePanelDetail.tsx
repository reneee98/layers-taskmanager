"use client";

import dynamic from "next/dynamic";
import type { FormEventHandler, ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckSquare2,
  Clock3,
  FileText,
  Loader2,
  MessageSquareText,
  Paperclip,
  Plus,
  Settings2,
} from "lucide-react";
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

const CommentsList = dynamic(
  () =>
    import("@/components/comments/CommentsList").then((module) => ({
      default: module.CommentsList,
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
  summary: ReactNode;
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
  summary,
  editor,
  isSaving,
  canSave,
  onSubmit,
  onClose,
  onTaskUpdate,
}: TaskSidePanelDetailProps) => {
  const [activeTab, setActiveTab] = useState("description");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
      <form id="task-side-panel-form" onSubmit={onSubmit} className="hidden" />

      <div className="min-h-0 flex-1 overflow-y-auto bg-card">
        {summary}

        <div className="sticky top-0 z-20 border-y border-border/70 bg-card/95 px-4 py-2.5 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <TabsList className="h-auto min-w-0 flex-1 justify-start overflow-x-auto rounded-none bg-transparent p-0 scrollbar-hide [&>*]:shrink-0">
              <TabsTrigger
                value="description"
                className="gap-2 rounded-lg px-3 data-[state=active]:bg-muted"
              >
                <FileText className="h-4 w-4" />
                Popis
              </TabsTrigger>
              <TabsTrigger
                value="communication"
                className="gap-2 rounded-lg px-3 data-[state=active]:bg-muted"
              >
                <MessageSquareText className="h-4 w-4" />
                Komunikácia
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="gap-2 rounded-lg px-3 data-[state=active]:bg-muted"
              >
                <Paperclip className="h-4 w-4" />
                Podklady
              </TabsTrigger>
              <TabsTrigger
                value="checklist"
                className="gap-2 rounded-lg px-3 data-[state=active]:bg-muted"
              >
                <CheckSquare2 className="h-4 w-4" />
                Checklist
              </TabsTrigger>
              <TabsTrigger
                value="time"
                className="gap-2 rounded-lg px-3 data-[state=active]:bg-muted"
              >
                <Clock3 className="h-4 w-4" />
                Čas
                {task.actual_hours != null && task.actual_hours > 0 ? (
                  <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {task.actual_hours.toFixed(1)} h
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="gap-2 rounded-lg px-3 data-[state=active]:bg-muted"
              >
                <Settings2 className="h-4 w-4" />
                Nastavenia
              </TabsTrigger>
            </TabsList>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setActiveTab("time")}
              className="hidden shrink-0 sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Zapísať čas
            </Button>
          </div>
        </div>

        <TabsContent value="description" className="m-0 p-5 sm:p-7">
          {editor}
        </TabsContent>

        <TabsContent value="communication" className="m-0 p-5 sm:p-7">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-5">
              <h3 className="text-sm font-semibold">Komunikácia k úlohe</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Komentáre a rozhodnutia zostanú priamo pri úlohe.
              </p>
            </div>
            <CommentsList taskId={task.id} />
          </section>
        </TabsContent>

        <TabsContent value="checklist" className="m-0 p-5 sm:p-7">
          <TaskChecklist taskId={task.id} />
        </TabsContent>

        <TabsContent value="time" className="m-0 space-y-5 p-5 sm:p-7">
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

        <TabsContent value="files" className="m-0 space-y-5 p-5 sm:p-7">
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

        <TabsContent value="settings" className="m-0 p-5 sm:p-7">
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

      <div className="flex shrink-0 items-center gap-2 border-t border-border/70 bg-card px-5 py-4 sm:px-7">
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
    </Tabs>
  );
};
