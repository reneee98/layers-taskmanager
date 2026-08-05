"use client";

import { useState, useMemo } from "react";
import { useOptimizedFetch } from "@/hooks/useOptimizedFetch";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

// Lazy load heavy components
const TaskTable = dynamic(() => import("@/components/tasks/TaskTable").then(mod => ({ default: mod.TaskTable })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const TaskDialog = dynamic(() => import("@/components/tasks/TaskDialog").then(mod => ({ default: mod.TaskDialog })), {
  loading: () => null,
  ssr: false,
});
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  List,
  Play,
  Send,
  User,
  FolderX,
  Target,
  Circle,
  Eye,
  CheckCircle2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { filterTasksByTab, getTaskCountsByTab, DashboardTabType } from "@/lib/dashboard-filters";
import type { Task } from "@/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { PageState } from "@/components/layout/page-state";
import { DataToolbar } from "@/components/layout/data-toolbar";

interface TasksResponse {
  success: boolean;
  data: Task[];
  error?: string;
}

export default function TasksPage() {
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Custom type for tasks page tabs (without "today")
  type TasksPageTabType = Exclude<DashboardTabType, "today"> | "no_project";
  
  const [activeTab, setActiveTab] = useState<TasksPageTabType>("all_active");

  const { data: tasksData, loading: isLoading, refetch, clearCache } = useOptimizedFetch<TasksResponse>(
    "/api/tasks",
    {
      cacheKey: "tasks_all",
      cacheExpiry: 1 * 60 * 1000, // 1 minute (tasks change frequently)
      onError: () => {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa načítať úlohy",
          variant: "destructive",
        });
      },
    }
  );

  const tasks = useMemo(
    () => (tasksData?.success ? (tasksData.data || []) : []),
    [tasksData]
  );

  // Helper functions for tabs
  const getTabLabel = (tab: TasksPageTabType) => {
    const labels: Record<TasksPageTabType, string> = {
      'all_active': 'Všetky aktívne',
      'this_week': 'Najbližších 7 dní',
      'todo': 'Na spracovanie',
      'in_progress': 'V procese',
      'review': 'Na kontrole',
      'sent_to_client': 'Odoslané klientovi',
      'done': 'Dokončené',
      'unassigned': 'Nepriradené',
      'no_project': 'Bez projektu',
    };
    return labels[tab] || tab;
  };

  const getTabIcon = (tab: TasksPageTabType) => {
    switch (tab) {
      case 'all_active':
        return List;
      case 'this_week':
        return Target;
      case 'todo':
        return Circle;
      case 'sent_to_client':
        return Send;
      case 'in_progress':
        return Play;
      case 'review':
        return Eye;
      case 'done':
        return CheckCircle2;
      case 'unassigned':
        return User;
      case 'no_project':
        return FolderX;
      default:
        return List;
    }
  };

  // Filter tasks based on active tab
  // Convert Task[] to the format expected by filterTasksByTab
  const tasksForFiltering = useMemo(() => {
    return tasks.map(task => {
      // Convert assignees format if needed
      const assignees = (task.assignees || []).map((assignee: any) => ({
        id: assignee.id || assignee.user_id,
        user_id: assignee.user_id,
        user: assignee.display_name ? {
          id: assignee.user_id,
          name: assignee.display_name,
          email: assignee.email || '',
        } : undefined,
      }));

      return {
        ...task,
        assignees,
        assignee_id: task.assignee_id ?? null,
        days_until_deadline: task.due_date 
          ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
      } as any; // Type assertion needed due to type mismatch between Task and AssignedTask
    });
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    // activeTab can be "no_project" which is not in DashboardTabType for filterTasksByTab
    // but we handle it here
    if (activeTab === 'no_project') {
      return tasksForFiltering.filter(task => 
        !task.project_id &&
        task.status !== "done" && 
        task.status !== "invoiced" &&
        task.status !== "cancelled"
      );
    }
    return filterTasksByTab(tasksForFiltering, activeTab as DashboardTabType);
  }, [tasksForFiltering, activeTab]);

  // Get task counts for each tab
  const taskCounts = useMemo(() => {
    const counts = getTaskCountsByTab(tasksForFiltering);
    // Add no_project count
    const noProjectCount = tasksForFiltering.filter(task => 
      !task.project_id &&
      task.status !== "done" && 
      task.status !== "invoiced" &&
      task.status !== "cancelled"
    ).length;
    
    return {
      ...counts,
      no_project: noProjectCount,
    } as Record<TasksPageTabType, number>;
  }, [tasksForFiltering]);

  const handleCreateTask = async () => {
    clearCache();
    await refetch();
    setIsTaskDialogOpen(false);
    setEditingTask(null);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        clearCache();
    await refetch();
        toast({
          title: "Úspech",
          description: "Úloha bola aktualizovaná",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa aktualizovať úlohu",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať úlohu",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Naozaj chcete vymazať túto úlohu?")) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        clearCache();
    await refetch();
        toast({
          title: "Úspech",
          description: "Úloha bola vymazaná",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa vymazať úlohu",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať úlohu",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <PageState variant="loading" title="Načítavam úlohy" />;
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Úlohy"
        description="Kompletný zoznam práce naprieč všetkými projektmi."
        icon={List}
        actions={
          <Button onClick={() => { setEditingTask(null); setIsTaskDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Pridať úlohu
          </Button>
        }
      />

      <div className="surface-panel overflow-hidden">
        {/* Mobile: Select Dropdown */}
        <div className="border-b border-border bg-muted/[0.16] p-3 lg:hidden">
          <Select value={activeTab} onValueChange={(value) => setActiveTab(value as TasksPageTabType)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(() => {
                  const Icon = getTabIcon(activeTab);
                  return (
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{getTabLabel(activeTab)}</span>
                      {taskCounts[activeTab] > 0 && (
                        <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                          {taskCounts[activeTab]}
                        </Badge>
                      )}
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(['all_active', 'this_week', 'todo', 'in_progress', 'review', 'sent_to_client', 'done', 'unassigned', 'no_project'] as TasksPageTabType[]).map((tab) => {
                const Icon = getTabIcon(tab);
                return (
                  <SelectItem key={tab} value={tab}>
                    <div className="flex items-center gap-2 w-full">
                      <Icon className="h-4 w-4" />
                      <span>{getTabLabel(tab)}</span>
                      {taskCounts[tab] > 0 && (
                        <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                          {taskCounts[tab]}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tabs */}
        <DataToolbar className="hidden rounded-none border-x-0 border-t-0 p-3 lg:flex">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TasksPageTabType)} className="w-full">
            <TabsList className="inline-flex h-9 min-w-max items-center justify-center rounded-md bg-background p-1 text-muted-foreground">
              <TabsTrigger value="all_active" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <List className="h-4 w-4 mr-2" />
                <span>Všetky aktívne</span>
                {taskCounts.all_active > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {taskCounts.all_active}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="no_project" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <FolderX className="h-4 w-4 mr-2" />
                <span>Bez projektu</span>
                {taskCounts.no_project > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {taskCounts.no_project}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent_to_client" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Send className="h-4 w-4 mr-2" />
                <span>Odoslané klientovi</span>
                {taskCounts.sent_to_client > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {taskCounts.sent_to_client}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Play className="h-4 w-4 mr-2" />
                <span>V procese</span>
                {taskCounts.in_progress > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {taskCounts.in_progress}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unassigned" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <User className="h-4 w-4 mr-2" />
                <span>Nepriradené</span>
                {taskCounts.unassigned > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {taskCounts.unassigned}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DataToolbar>

        {/* Task List */}
        <div className="p-4">
          {filteredTasks.length > 0 ? (
            <TaskTable
              tasks={filteredTasks as Task[]}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              onEdit={(task) => {
                setEditingTask(task);
                setIsTaskDialogOpen(true);
              }}
              onReorder={undefined}
              projectId=""
              onTaskUpdated={async () => {
                clearCache();
                await refetch();
              }}
            />
          ) : (
            <PageState
              compact
              icon={getTabIcon(activeTab)}
              title={`Žiadne úlohy: ${getTabLabel(activeTab)}`}
              description="V tejto kategórii momentálne nie je žiadna práca."
              action={
                <Button size="sm" onClick={() => { setEditingTask(null); setIsTaskDialogOpen(true); }}>
                  <Plus className="h-4 w-4" />
                  Vytvoriť úlohu
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Task Dialog */}
      <TaskDialog
        projectId={null}
        task={editingTask}
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        onSuccess={handleCreateTask}
      />
    </div>
  );
}
