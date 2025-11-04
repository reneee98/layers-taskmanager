"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Project, Task } from "@/types/database";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const refreshSummaryRef = useRef<(() => Promise<void>) | null>(null);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const result = await response.json();

      if (result.success) {
        setProject(result.data);
      } else {
        toast({
          title: "Chyba",
          description: "Projekt nebol nájdený",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať projekt",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?project_id=${projectId}`);
      const result = await response.json();

      if (result.success) {
        setTasks(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [projectId]);

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
      fetchTasks();
    };

    window.addEventListener('timeEntryAdded', handleTimeEntryAdded);
    window.addEventListener('taskStatusChanged', handleTaskStatusChanged);
    return () => {
      window.removeEventListener('timeEntryAdded', handleTimeEntryAdded);
      window.removeEventListener('taskStatusChanged', handleTaskStatusChanged);
    };
  }, []);

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
        fetchTasks();
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
        fetchTasks();
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
        fetchTasks();
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
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Načítavam...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Projekt nebol nájdený</p>
      </div>
    );
  }

  const handleUpdateSummary = (refreshFn: () => Promise<void>) => {
    refreshSummaryRef.current = refreshFn;
  };

  return (
    <div className="w-full space-y-6">
      <ProjectHeader project={project} tasks={tasks} onUpdate={handleUpdateSummary} />

      {/* Task List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Úlohy projektu</h2>
          <Button onClick={() => {
            setEditingTask(null);
            setIsTaskDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
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
            onTaskUpdated={() => {
              // Refresh project data when task is updated
              fetchProject();
              // Also refresh summary if available
              if (refreshSummaryRef.current && typeof refreshSummaryRef.current === 'function') {
                refreshSummaryRef.current();
              }
            }}
          />
        ) : (
          <div className="rounded-md border p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Zatiaľ žiadne úlohy v tomto projekte
            </p>
            <Button onClick={() => {
              setEditingTask(null);
              setIsTaskDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Vytvoriť prvú úlohu
            </Button>
          </div>
        )}
      </div>

      {/* Task Dialog */}
      <TaskDialog
        projectId={projectId}
        task={editingTask}
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        onSuccess={() => {
          fetchTasks();
          // Refresh project summary (zisk, náklady, atď.) after task is added/updated
          if (refreshSummaryRef.current && typeof refreshSummaryRef.current === 'function') {
            refreshSummaryRef.current();
          }
        }}
      />
    </div>
  );
}

