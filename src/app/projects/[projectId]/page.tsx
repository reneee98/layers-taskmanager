"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

// Lazy load heavy components
const ProjectHeader = dynamic(() => import("@/components/projects/ProjectHeader").then(mod => ({ default: mod.ProjectHeader })), {
  loading: () => <div className="h-32 bg-muted animate-pulse rounded"></div>,
});

const TaskTable = dynamic(() => import("@/components/tasks/TaskTable").then(mod => ({ default: mod.TaskTable })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const TaskDialog = dynamic(() => import("@/components/tasks/TaskDialog").then(mod => ({ default: mod.TaskDialog })), {
  loading: () => null,
  ssr: false,
});
import { ListChecks, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useOptimizedFetch } from "@/hooks/useOptimizedFetch";
import type { Project, Task } from "@/types/database";
import { PageState } from "@/components/layout/page-state";

interface ProjectResponse {
  success: boolean;
  data: Project;
  error?: string;
}

interface TasksResponse {
  success: boolean;
  data: Task[];
  error?: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const refreshSummaryRef = useRef<(() => Promise<void>) | null>(null);

  // Fetch project and tasks in parallel with cache
  const { 
    data: projectData, 
    loading: projectLoading, 
    refetch: refetchProject,
    clearCache: clearProjectCache 
  } = useOptimizedFetch<ProjectResponse>(
    projectId ? `/api/projects/${projectId}` : null,
    {
      cacheKey: `project_${projectId}`,
      cacheExpiry: 2 * 60 * 1000, // 2 minutes
      onError: () => {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa načítať projekt",
          variant: "destructive",
        });
      },
    }
  );

  const { 
    data: tasksData, 
    loading: tasksLoading, 
    refetch: refetchTasks,
    clearCache: clearTasksCache 
  } = useOptimizedFetch<TasksResponse>(
    projectId ? `/api/tasks?project_id=${projectId}` : null,
    {
      cacheKey: `tasks_project_${projectId}`,
      cacheExpiry: 1 * 60 * 1000, // 1 minute (tasks change more frequently)
      onError: (error) => {
        console.error("Failed to fetch tasks:", error);
      },
    }
  );

  const project = projectData?.success ? projectData.data : null;
  const tasks = tasksData?.success ? tasksData.data : [];
  const isLoading = projectLoading || tasksLoading;

  // Listen for time entry added events from task detail pages
  useEffect(() => {
    const handleTimeEntryAdded = () => {
      if (refreshSummaryRef.current && typeof refreshSummaryRef.current === 'function') {
        refreshSummaryRef.current();
      }
    };

    const handleTaskStatusChanged = () => {
      if (refreshSummaryRef.current && typeof refreshSummaryRef.current === 'function') {
        refreshSummaryRef.current();
      }
      // Also refresh tasks list when status changes
      clearTasksCache();
      refetchTasks();
    };

    window.addEventListener('timeEntryAdded', handleTimeEntryAdded);
    window.addEventListener('taskStatusChanged', handleTaskStatusChanged);
    return () => {
      window.removeEventListener('timeEntryAdded', handleTimeEntryAdded);
      window.removeEventListener('taskStatusChanged', handleTaskStatusChanged);
    };
  }, [clearTasksCache, refetchTasks]);

  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        toast({ title: "Úspech", description: "Úloha bola aktualizovaná" });
        clearTasksCache();
        clearProjectCache();
        await Promise.all([refetchTasks(), refetchProject()]);
        // Refresh project summary (zisk, náklady) when task is updated, especially if budget changed
        if (refreshSummaryRef.current && typeof refreshSummaryRef.current === 'function') {
          refreshSummaryRef.current();
        }
        // Dispatch event to refresh dashboard stats when status changes
        if (data.status) {
          window.dispatchEvent(new CustomEvent('taskStatusChanged', { 
            detail: { taskId, status: data.status } 
          }));
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa aktualizovať úlohu",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Naozaj chcete vymazať túto úlohu?")) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        toast({ title: "Úspech", description: "Úloha bola odstránená" });
        clearTasksCache();
        clearProjectCache();
        await Promise.all([refetchTasks(), refetchProject()]);
        // Refresh project summary (zisk, náklady) when task is deleted
        if (refreshSummaryRef.current && typeof refreshSummaryRef.current === 'function') {
          refreshSummaryRef.current();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa odstrániť úlohu",
        variant: "destructive",
      });
    }
  };

  const handleReorderTasks = async (taskId: string, newIndex: number) => {
    try {
      // Create new order for all tasks
      const newTasks = [...tasks];
      const draggedIndex = newTasks.findIndex((t) => t.id === taskId);
      
      if (draggedIndex === -1) return;
      
      // Move task to new position
      const [draggedTask] = newTasks.splice(draggedIndex, 1);
      newTasks.splice(newIndex, 0, draggedTask);
      
      // Update order_index for all tasks
      const tasksWithNewOrder = newTasks.map((task, index) => ({
        id: task.id,
        order_index: index,
      }));

      const response = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasksWithNewOrder }),
      });
      const result = await response.json();

      if (result.success) {
        clearTasksCache();
        await refetchTasks();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa preusporiadať úlohy",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <PageState variant="loading" title="Načítavam projekt" />;
  }

  if (!project) {
    return (
      <PageState
        variant="error"
        title="Projekt nebol nájdený"
        description="Projekt mohol byť odstránený alebo k nemu nemáte prístup."
      />
    );
  }

  const handleUpdateSummary = (refreshFn: () => Promise<void>) => {
    refreshSummaryRef.current = refreshFn;
  };

  return (
    <div className="page-shell">
      <ProjectHeader project={project} tasks={tasks} onUpdate={handleUpdateSummary} />

      {/* Task List */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Úlohy projektu</h2>
            <p className="mt-1 text-xs text-muted-foreground">{tasks.length} {tasks.length === 1 ? "úloha" : "úloh"} v tomto projekte</p>
          </div>
          <Button onClick={() => {
            setEditingTask(null);
            setIsTaskDialogOpen(true);
          }}>
            <Plus className="h-4 w-4" />
            Nová úloha
          </Button>
        </div>

        {tasks.length > 0 ? (
          <TaskTable
            tasks={tasks}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            onEdit={(task) => {
              setEditingTask(task);
              setIsTaskDialogOpen(true);
            }}
            onReorder={handleReorderTasks}
            projectId={projectId}
            project={project}
            onTaskUpdated={async () => {
              // Refresh project data when task is updated
              clearProjectCache();
              clearTasksCache();
              await Promise.all([refetchProject(), refetchTasks()]);
              // Also refresh summary if available
              if (refreshSummaryRef.current && typeof refreshSummaryRef.current === 'function') {
                refreshSummaryRef.current();
              }
            }}
          />
        ) : (
          <PageState
            compact
            icon={ListChecks}
            title="Projekt zatiaľ nemá úlohy"
            description="Vytvorte prvú úlohu a priraďte jej termín alebo riešiteľa."
            action={
              <Button size="sm" onClick={() => { setEditingTask(null); setIsTaskDialogOpen(true); }}>
                <Plus className="h-4 w-4" />
                Vytvoriť prvú úlohu
              </Button>
            }
          />
        )}
      </div>

      {/* Task Dialog */}
      <TaskDialog
        projectId={projectId}
        task={editingTask}
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        onSuccess={async () => {
          clearTasksCache();
          clearProjectCache();
          await Promise.all([refetchTasks(), refetchProject()]);
          // Refresh project summary (zisk, náklady, atď.) after task is added/updated
          if (refreshSummaryRef.current && typeof refreshSummaryRef.current === 'function') {
            refreshSummaryRef.current();
          }
        }}
      />
    </div>
  );
}
