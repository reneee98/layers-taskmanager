"use client";

import { useState, useEffect, useMemo } from "react";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { Button } from "@/components/ui/button";
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
  FolderX
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { filterTasksByTab, getTaskCountsByTab, DashboardTabType } from "@/lib/dashboard-filters";
import type { Task } from "@/types/database";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Custom type for tasks page tabs (without "today")
  type TasksPageTabType = Exclude<DashboardTabType, "today"> | "no_project";
  
  const [activeTab, setActiveTab] = useState<TasksPageTabType>("all_active");

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/tasks");
      const result = await response.json();

      if (result.success) {
        setTasks(result.data || []);
      } else {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa načítať úlohy",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať úlohy",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Helper functions for tabs
  const getTabLabel = (tab: TasksPageTabType) => {
    const labels: Record<TasksPageTabType, string> = {
      'all_active': 'Všetky aktívne',
      'sent_to_client': 'Poslané klientovi',
      'in_progress': 'In progress',
      'unassigned': 'Nepriradené',
      'no_project': 'Bez projektu',
    };
    return labels[tab] || tab;
  };

  const getTabIcon = (tab: TasksPageTabType) => {
    switch (tab) {
      case 'all_active':
        return List;
      case 'sent_to_client':
        return Send;
      case 'in_progress':
        return Play;
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
        assignee_id: task.assigned_to || null,
        days_until_deadline: task.due_date 
          ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
      };
    });
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    // activeTab can be "no_project" which is not in DashboardTabType for filterTasksByTab
    // but we handle it here
    if (activeTab === 'no_project') {
      return tasksForFiltering.filter(task => 
        !task.project_id &&
        task.status !== "done" && 
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
      task.status !== "cancelled"
    ).length;
    
    return {
      ...counts,
      no_project: noProjectCount,
    } as Record<TasksPageTabType, number>;
  }, [tasksForFiltering]);

  const handleCreateTask = async () => {
    await fetchTasks();
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
        await fetchTasks();
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
        await fetchTasks();
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

  const handleReorderTasks = async (tasks: Task[]) => {
    try {
      const response = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: tasks.map((task, index) => ({
            id: task.id,
            order_index: index,
          })),
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchTasks();
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa zmeniť poradie úloh",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to reorder tasks:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa zmeniť poradie úloh",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Úlohy</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Všetky úlohy vo vašom workspace
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Načítavam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Úlohy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Všetky úlohy vo vašom workspace
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null);
            setIsTaskDialogOpen(true);
          }}
          className="bg-gray-900 text-white hover:bg-gray-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Pridať úlohu
        </Button>
      </div>

      {/* Filters */}
      <div className="border rounded-lg bg-card">
        {/* Mobile: Select Dropdown */}
        <div className="lg:hidden p-4 border-b">
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
              {(['all_active', 'sent_to_client', 'in_progress', 'unassigned', 'no_project'] as TasksPageTabType[]).map((tab) => {
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
        <div className="hidden lg:block p-4 border-b">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TasksPageTabType)} className="w-full">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground min-w-max">
              <TabsTrigger value="all_active" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <List className="h-4 w-4 mr-2" />
                <span>Všetky aktívne</span>
                {taskCounts.all_active > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                    {taskCounts.all_active}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="no_project" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <FolderX className="h-4 w-4 mr-2" />
                <span>Bez projektu</span>
                {taskCounts.no_project > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                    {taskCounts.no_project}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent_to_client" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Send className="h-4 w-4 mr-2" />
                <span>Poslané klientovi</span>
                {taskCounts.sent_to_client > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                    {taskCounts.sent_to_client}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Play className="h-4 w-4 mr-2" />
                <span>In progress</span>
                {taskCounts.in_progress > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                    {taskCounts.in_progress}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unassigned" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <User className="h-4 w-4 mr-2" />
                <span>Nepriradené</span>
                {taskCounts.unassigned > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                    {taskCounts.unassigned}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

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
              onReorder={handleReorderTasks}
              projectId={null}
              onTaskUpdated={() => {
                fetchTasks();
              }}
            />
          ) : (
            <div className="rounded-md border p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Žiadne úlohy v kategórii "{getTabLabel(activeTab)}"
              </p>
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskDialogOpen(true);
                }}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Vytvoriť úlohu
              </Button>
            </div>
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

