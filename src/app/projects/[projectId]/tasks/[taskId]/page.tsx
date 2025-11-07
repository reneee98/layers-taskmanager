"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Clock, 
  Euro, 
  BarChart3, 
  FileText, 
  MessageSquare,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
  MoreHorizontal,
  Copy,
  Trash2,
  Flag,
  Target,
  Zap,
  TrendingUp,
  Activity,
  Play,
  Plus,
  Link,
  ExternalLink,
  Settings,
  Save,
  X,
  Timer,
  Square,
  Flame
} from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy load heavy components
const TimePanel = dynamic(() => import("@/components/time/TimePanel").then(mod => ({ default: mod.TimePanel })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const CostsPanel = dynamic(() => import("@/components/costs/CostsPanel").then(mod => ({ default: mod.CostsPanel })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const ProjectReport = dynamic(() => import("@/components/report/ProjectReport").then(mod => ({ default: mod.ProjectReport })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const CommentsList = dynamic(() => import("@/components/comments/CommentsList").then(mod => ({ default: mod.CommentsList })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const QuillEditor = dynamic(() => import("@/components/ui/quill-editor").then(mod => ({ default: mod.QuillEditor })), {
  loading: () => <div className="h-32 bg-muted animate-pulse rounded"></div>,
  ssr: false,
});

const MultiAssigneeSelect = dynamic(() => import("@/components/tasks/MultiAssigneeSelect").then(mod => ({ default: mod.MultiAssigneeSelect })), {
  loading: () => <div className="h-10 bg-muted animate-pulse rounded"></div>,
});

const StatusSelect = dynamic(() => import("@/components/tasks/StatusSelect").then(mod => ({ default: mod.StatusSelect })), {
  loading: () => <div className="h-10 bg-muted animate-pulse rounded"></div>,
});

const PrioritySelect = dynamic(() => import("@/components/tasks/PrioritySelect").then(mod => ({ default: mod.PrioritySelect })), {
  loading: () => <div className="h-10 bg-muted animate-pulse rounded"></div>,
});

const DateRangePicker = dynamic(() => import("@/components/ui/date-range-picker").then(mod => ({ default: mod.DateRangePicker })), {
  loading: () => <div className="h-10 bg-muted animate-pulse rounded"></div>,
  ssr: false,
});

const GoogleDriveLinks = dynamic(() => import("@/components/tasks/GoogleDriveLinks").then(mod => ({ default: mod.GoogleDriveLinks })), {
  loading: () => <div className="h-20 bg-muted animate-pulse rounded"></div>,
});

const TaskChecklist = dynamic(() => import("@/components/tasks/TaskChecklist").then(mod => ({ default: mod.TaskChecklist })), {
  loading: () => <div className="h-32 bg-muted animate-pulse rounded"></div>,
});

const TaskFiles = dynamic(() => import("@/components/tasks/TaskFiles").then(mod => ({ default: mod.TaskFiles })), {
  loading: () => <div className="h-32 bg-muted animate-pulse rounded"></div>,
});

const FileUploadHandler = dynamic(() => import("@/components/tasks/FileUploadHandler").then(mod => ({ default: mod.FileUploadHandler })), {
  ssr: false,
});
import { toast } from "@/hooks/use-toast";
import { formatHours } from "@/lib/format";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { Task, TaskAssignee } from "@/types/database";
import { cn } from "@/lib/utils";
import { getDeadlineStatus, getDeadlineBadge } from "@/lib/deadline-utils";
import { useTimer } from "@/contexts/TimerContext";
import { usePermission } from "@/hooks/usePermissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import type { Project } from "@/types/database";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeTimer, startTimer, stopTimer } = useTimer();
  const { hasPermission: canReadTasks } = usePermission('tasks', 'read');
  const { hasPermission: canViewHourlyRates } = usePermission('financial', 'view_hourly_rates');
  const { hasPermission: canViewPrices } = usePermission('financial', 'view_prices');
  const { hasPermission: canViewCosts } = usePermission('financial', 'view_costs');
  const { hasPermission: canViewReports } = usePermission('financial', 'view_reports');
  const { hasPermission: canReadTimeEntries } = usePermission('time_entries', 'read');
  const { hasPermission: canReadComments } = usePermission('comments', 'read');
  const { hasPermission: canCreateComments } = usePermission('comments', 'create');
  const { hasPermission: canUpdateTasks } = usePermission('tasks', 'update');
  const { hasPermission: canCreateTasks } = usePermission('tasks', 'create');
  const { hasPermission: canDeleteTasks } = usePermission('tasks', 'delete');
  const [task, setTask] = useState<Task | null>(null);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing] = useState(true); // Always in editing mode
  const [activeTab, setActiveTab] = useState("overview");
  const [rightSidebarTab, setRightSidebarTab] = useState(canReadComments ? "comments" : "links");
  const [hasChanges, setHasChanges] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [linksCount, setLinksCount] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isStartingTimer, setIsStartingTimer] = useState(false);
  const prevActiveTimerRef = useRef<typeof activeTimer>(null);
  const [projectSelectOpen, setProjectSelectOpen] = useState(false);

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.taskId}`);
      
      if (!response.ok) {
        const result = await response.json();
        console.error("Failed to fetch task:", response.status, result.error || "Unknown error");
        setTask(null);
        toast({
          title: "Chyba",
          description: result.error || `Nepodarilo sa načítať úlohu (${response.status})`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const result = await response.json();

      if (result.success && result.data) {
        setTask(result.data);
        setDescription(result.data.description || "");
        setDescriptionHtml(result.data.description || "");
        setAssignees(result.data.assignees || []);
        setHasChanges(false);
      } else {
        console.error("Failed to fetch task:", result.error || "Unknown error");
        setTask(null);
        toast({
          title: "Chyba",
          description: result.error || "Úloha nebola nájdená alebo nemáte oprávnenie na jej zobrazenie",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      setTask(null);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať úlohu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssignees = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.taskId}/assignees`);
      const result = await response.json();

      if (result.success) {
        setAssignees(result.data);
      }
    } catch (error) {
      // Silently fail - assignees are already loaded from task data
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const result = await response.json();

      if (result.success) {
        setProjects(result.data);
      }
    } catch (error) {
      // Silently fail - projects are not critical for initial render
    }
  };

  const fetchCommentsCount = async () => {
    if (!canReadComments) {
      setCommentsCount(0);
      return;
    }
    
    try {
      const response = await fetch(`/api/tasks/${params.taskId}/comments`);
      const result = await response.json();
      if (result.success) {
        setCommentsCount(result.data?.length || 0);
      }
    } catch (error) {
      // Silently fail - comments count is not critical
    }
  };

  const fetchLinksCount = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.taskId}/drive-links`);
      const result = await response.json();
      // API returns { data: [...] } not { success: true, data: [...] }
      if (response.ok && result.data) {
        setLinksCount(result.data?.length || 0);
      } else {
        setLinksCount(0);
      }
    } catch (error) {
      setLinksCount(0);
    }
  };

  useEffect(() => {
    // Load critical data first (task), then load other non-critical data in parallel
    const loadData = async () => {
      await fetchTask();
      // Load non-critical data after task is loaded
      const nonCriticalPromises = [
        fetchAssignees(),
        fetchProjects(),
        fetchLinksCount(),
      ];
      
      // Only fetch comments count if user has permission
      if (canReadComments) {
        nonCriticalPromises.push(fetchCommentsCount());
      }
      
      Promise.all(nonCriticalPromises).catch(() => {
        // Silently fail - non-critical data
      });
    };
    loadData();
  }, [params.taskId, canReadComments]);

  // Refresh task when timer stops (to update actual_hours)
  useEffect(() => {
    // Only refresh if timer was active and is now stopped
    if (prevActiveTimerRef.current && !activeTimer && task) {
      // Small delay to ensure backend has updated the task
      const timeout = setTimeout(() => {
        fetchTask();
      }, 500);
      prevActiveTimerRef.current = activeTimer;
      return () => clearTimeout(timeout);
    }
    prevActiveTimerRef.current = activeTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimer]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Listen for time entry added events to refresh task
  useEffect(() => {
    const handleTimeEntryAdded = () => {
      fetchTask();
    };

    window.addEventListener('timeEntryAdded', handleTimeEntryAdded);
    return () => {
      window.removeEventListener('timeEntryAdded', handleTimeEntryAdded);
    };
  }, []);

  useEffect(() => {
    if (task) {
      setDescription(task.description || "");
      setDescriptionHtml(task.description || "");
    }
  }, [task]);

  const handleDescriptionChange = (content: string, html: string) => {
    setDescription(content);
    setDescriptionHtml(html);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    if (html) {
      // Save immediately with a small delay to avoid too many requests
      saveTimeoutRef.current = setTimeout(() => {
        handleSaveDescriptionWithContent(html);
      }, 500);
    }
  };

  const handleDuplicate = async () => {
    if (!task) return;

    try {
      setIsSaving(true);
      
      // Prepare task data for duplication (exclude id, created_at, updated_at)
      const {
        id,
        created_at,
        updated_at,
        assignees,
        actual_hours,
        ...taskData
      } = task;

      // Add " (Kópia)" to title
      const duplicatedTaskData = {
        ...taskData,
        title: `${task.title} (Kópia)`,
        status: "todo", // Reset status to todo
        start_date: null, // Reset dates
        due_date: null,
        actual_hours: 0, // Reset actual hours
      };

      // Create duplicated task
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(duplicatedTaskData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Nepodarilo sa duplikovať úlohu");
      }

      const newTaskId = result.data.id;

      // Copy assignees if they exist
      if (assignees && assignees.length > 0) {
        const assigneeIds = assignees.map((a: any) => a.user_id);
        await fetch(`/api/tasks/${newTaskId}/assignees`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_ids: assigneeIds }),
        });
      }

      // Copy checklist items
      try {
        const checklistResponse = await fetch(`/api/tasks/${task.id}/checklist`);
        const checklistResult = await checklistResponse.json();
        // API returns { data: [...] } not { success: true, data: [...] }
        if (checklistResponse.ok && checklistResult.data && Array.isArray(checklistResult.data)) {
          for (const item of checklistResult.data) {
            await fetch(`/api/tasks/${newTaskId}/checklist`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: item.text,
              }),
            });
          }
        }
      } catch (error) {
        console.error("Error copying checklist:", error);
        // Continue even if checklist copy fails
      }

      // Copy drive links
      try {
        const linksResponse = await fetch(`/api/tasks/${task.id}/drive-links`);
        const linksResult = await linksResponse.json();
        if (linksResult.data && Array.isArray(linksResult.data)) {
          for (const link of linksResult.data) {
            await fetch(`/api/tasks/${newTaskId}/drive-links`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: link.url,
                description: link.description,
              }),
            });
          }
        }
      } catch (error) {
        console.error("Error copying drive links:", error);
        // Continue even if links copy fails
      }

      toast({
        title: "Úspech",
        description: "Úloha bola duplikovaná",
      });

      // Navigate to new task - ensure project_id is not empty
      const validProjectId = (task.project_id && task.project_id.trim() !== '') 
        ? task.project_id 
        : 'unknown';
      router.push(`/projects/${validProjectId}/tasks/${newTaskId}`);
    } catch (error) {
      console.error("Error duplicating task:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa duplikovať úlohu",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    if (!confirm("Naozaj chcete vymazať túto úlohu?")) {
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Nepodarilo sa vymazať úlohu");
      }

      toast({
        title: "Úspech",
        description: "Úloha bola vymazaná",
      });

      // Navigate back to project
      router.push(`/projects/${task.project_id}`);
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa vymazať úlohu",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!task || isSaving) return;

    setIsSaving(true);
    try {
      // Save task settings (including task budget)
      const taskPayload: any = {
        estimated_hours: task.estimated_hours,
      };
      
      // Include task budget if it exists
      if (task.budget_cents !== undefined) {
        taskPayload.budget_cents = task.budget_cents;
      }
      
      const taskResponse = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskPayload),
      });

      const taskResult = await taskResponse.json();

      if (taskResult.success) {
        // Reload task to get fresh data from database
        await fetchTask();
        setHasChanges(false);
        toast({
          title: "Úspech",
          description: "Nastavenia boli uložené",
        });
      } else {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa uložiť nastavenia",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa uložiť nastavenia",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDescriptionWithContent = async (content: string) => {
    if (!task || isSaving || !content) return;

    // Remove the image delay logic - save immediately

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: content.trim() || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTask(result.data);
      } else {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa uložiť popis úlohy",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa uložiť popis úlohy",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssigneesChange = (newAssignees: TaskAssignee[]) => {
    setAssignees(newAssignees);
  };

  const handleStatusChange = async (newStatus: "todo" | "in_progress" | "review" | "sent_to_client" | "done" | "cancelled") => {
    if (!task) return;
    
    try {
      const response = await fetch(`/api/tasks/${params.taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTask({ ...task, status: newStatus });
        toast({
          title: "Úspech",
          description: "Status úlohy bol aktualizovaný",
        });
        // Dispatch event to refresh project summary
        window.dispatchEvent(new CustomEvent('taskStatusChanged', { 
          detail: { taskId: params.taskId, status: newStatus } 
        }));
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa aktualizovať status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať status",
        variant: "destructive",
      });
    }
  };

  const handlePriorityChange = async (newPriority: "low" | "medium" | "high" | "urgent") => {
    if (!task) return;
    
    try {
      const response = await fetch(`/api/tasks/${params.taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priority: newPriority,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTask({ ...task, priority: newPriority });
        toast({
          title: "Úspech",
          description: "Priorita úlohy bola aktualizovaná",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa aktualizovať prioritu",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating priority:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať prioritu",
        variant: "destructive",
      });
    }
  };

  const handleStartDateChange = async (newStartDate: string | null) => {
    if (!task) return;
    
    try {
      const response = await fetch(`/api/tasks/${params.taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_date: newStartDate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTask({ ...task, start_date: newStartDate });
        toast({
          title: "Úspech",
          description: "Dátum začiatku bol aktualizovaný",
        });
        // Dispatch event to refresh dashboard
        window.dispatchEvent(new CustomEvent('taskStatusChanged', { 
          detail: { taskId: params.taskId } 
        }));
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa aktualizovať dátum začiatku",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating start date:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať dátum začiatku",
        variant: "destructive",
      });
    }
  };

  const handleEndDateChange = async (newEndDate: string | null) => {
    if (!task) return;
    
    try {
      const response = await fetch(`/api/tasks/${params.taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          end_date: newEndDate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTask({ ...task, end_date: newEndDate });
        toast({
          title: "Úspech",
          description: "Dátum konca bol aktualizovaný",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa aktualizovať dátum konca",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating end date:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať dátum konca",
        variant: "destructive",
      });
    }
  };

  const handleProjectChange = async (newProjectId: string | null) => {
    if (!task || newProjectId === task.project_id) return;
    
    try {
      const response = await fetch(`/api/tasks/${params.taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: newProjectId === null ? null : newProjectId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reload task to get updated project data
        await fetchTask();
        toast({
          title: "Úspech",
          description: newProjectId 
            ? "Úloha bola presunutá do iného projektu"
            : "Projekt bol odstránený z úlohy",
        });
        // Dispatch event to refresh project summary
        window.dispatchEvent(new CustomEvent('taskStatusChanged', { 
          detail: { taskId: params.taskId, projectId: newProjectId } 
        }));
        // Redirect to new project's task page or stay on current page if no project
        if (newProjectId) {
          router.push(`/projects/${newProjectId}/tasks/${params.taskId}`);
        } else {
          // If task has no project, redirect to tasks page or stay on dashboard
          // For now, we'll stay on the current page but update the URL
          router.push(`/tasks`);
        }
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa presunúť úlohu",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa presunúť úlohu",
        variant: "destructive",
      });
    }
  };

  const handleDueDateChange = async (newDueDate: string | null) => {
    if (!task) return;
    
    
    try {
      const response = await fetch(`/api/tasks/${params.taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          due_date: newDueDate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update task with returned data (includes updated start_date if it was auto-set)
        const updatedTask = { ...task, due_date: newDueDate, start_date: result.data?.start_date || task.start_date };
        setTask(updatedTask);
        toast({
          title: "Úspech",
          description: "Deadline bol aktualizovaný",
        });
        // Dispatch event to refresh dashboard
        window.dispatchEvent(new CustomEvent('taskStatusChanged', { 
          detail: { taskId: params.taskId } 
        }));
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa aktualizovať deadline",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať deadline",
        variant: "destructive",
      });
    }
  };

  const handleTimerToggle = async () => {
    if (!task) return;

    // If this task is currently being tracked, stop it and save time entry
    if (activeTimer && activeTimer.task_id === task.id) {
      try {
        // Vypočítať trvanie priamo z activeTimer.started_at
        const startedAt = new Date(activeTimer.started_at);
        const now = new Date();
        const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        
        if (duration > 0) {
          const trackedHours = Number((duration / 3600).toFixed(3));
          const endTime = now.toTimeString().slice(0, 8);
          const startTime = startedAt.toTimeString().slice(0, 8);
          
          try {
            const payload = {
              hours: trackedHours,
              date: now.toISOString().split("T")[0],
              description: "",
              start_time: startTime,
              end_time: endTime,
            };

            const response = await fetch(`/api/tasks/${activeTimer.task_id}/time`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.success) {
              toast({
                title: "Časovač zastavený",
                description: `Zapísaných ${formatHours(trackedHours)} do úlohy.`,
              });
              // Refresh task to update actual_hours
              fetchTask();
            } else {
              throw new Error(result.error);
            }
          } catch (error) {
            console.error("Error saving time entry:", error);
            toast({
              title: "Chyba",
              description: error instanceof Error ? error.message : "Nepodarilo sa uložiť čas do úlohy",
              variant: "destructive",
            });
          }
        }
        
        await stopTimer();
      } catch (error) {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa zastaviť časovač",
          variant: "destructive",
        });
      }
      return;
    }

    // If another task is being tracked, stop it first and save time entry
    if (activeTimer) {
      try {
        // Vypočítať trvanie priamo z activeTimer.started_at
        const startedAt = new Date(activeTimer.started_at);
        const now = new Date();
        const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const trackedHours = Number((duration / 3600).toFixed(3));
        
        if (trackedHours > 0) {
          const endTime = now.toTimeString().slice(0, 8);
          const startTime = startedAt.toTimeString().slice(0, 8);
          
          try {
            const payload = {
              hours: trackedHours,
              date: now.toISOString().split("T")[0],
              description: "",
              start_time: startTime,
              end_time: endTime,
            };

            const response = await fetch(`/api/tasks/${activeTimer.task_id}/time`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.success) {
              toast({
                title: "Predchádzajúci časovač uložený",
                description: `Zapísaných ${formatHours(trackedHours)} do úlohy "${activeTimer.task_name}".`,
              });
            }
          } catch (error) {
            console.error("Error saving previous timer:", error);
            toast({
              title: "Chyba",
              description: "Nepodarilo sa uložiť predchádzajúci časovač",
              variant: "destructive",
            });
          }
        }
        
        await stopTimer();
      } catch (error) {
        console.error("Error stopping previous timer:", error);
      }
    }

    // Start tracking this task
    try {
      setIsStartingTimer(true);
      await startTimer(
        task.id,
        task.title,
        task.project_id,
        task.project?.name || "Neznámy projekt"
      );
      toast({
        title: "Časovač spustený",
        description: `Začal som trackovať čas pre úlohu "${task.title}"`,
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa spustiť časovač",
        variant: "destructive",
      });
    } finally {
      setIsStartingTimer(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-muted text-foreground border-border";
      case "in_progress":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
      case "review":
        return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800";
      case "done":
        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800";
      case "low":
        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return Target;
      case "in_progress":
        return Activity;
      case "review":
        return CheckCircle;
      case "done":
        return CheckCircle;
      case "cancelled":
        return AlertCircle;
      default:
        return Target;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return Flag;
      case "high":
        return TrendingUp;
      case "medium":
        return Zap;
      case "low":
        return Target;
      default:
        return Target;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Načítavam úlohu...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">Úloha nebola nájdená</p>
          <p className="text-muted-foreground">
            {!canReadTasks 
              ? "Nemáte oprávnenie na zobrazenie tejto úlohy" 
              : "Skúste obnoviť stránku alebo sa vráťte na projekt"}
          </p>
        </div>
      </div>
    );
  }

  const deadlineStatus = getDeadlineStatus(task.due_date);
  const deadlineBadge = getDeadlineBadge(deadlineStatus);
  const StatusIcon = getStatusIcon(task.status);
  const PriorityIcon = getPriorityIcon(task.priority);

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${params.projectId}`)}
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Späť
          </Button>
          <div className="h-4 w-px bg-border" />
          {/* Project Select */}
          <Popover open={canUpdateTasks ? projectSelectOpen : false} onOpenChange={canUpdateTasks ? setProjectSelectOpen : undefined}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                role="combobox"
                disabled={!canUpdateTasks}
                className={cn(
                  "w-auto h-auto border-none shadow-none px-2 py-1 justify-between",
                  canUpdateTasks ? "hover:bg-accent" : "cursor-default"
                )}
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {task.project ? (
                    <>
                      <span className="font-medium">{task.project.name}</span>
                      <span>•</span>
                      <span className="font-mono text-xs">{task.project.code}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Bez projektu</span>
                  )}
                </div>
                {canUpdateTasks && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
              </Button>
            </PopoverTrigger>
            {canUpdateTasks && (
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Hľadať projekt..." />
                  <CommandList>
                    <CommandEmpty>Žiadny projekt sa nenašiel.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="Bez projektu"
                        onSelect={() => {
                          handleProjectChange(null);
                          setProjectSelectOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !task.project_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-muted-foreground">Bez projektu</span>
                      </CommandItem>
                      {projects.map((project) => (
                        <CommandItem
                          key={project.id}
                          value={`${project.name} ${project.code}`}
                          onSelect={() => {
                            handleProjectChange(project.id);
                            setProjectSelectOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              task.project_id === project.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{project.name}</span>
                            {project.code && (
                              <span className="text-xs text-muted-foreground font-mono">
                                ({project.code})
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            )}
          </Popover>
        </div>
        
        {(canCreateTasks || canDeleteTasks) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canCreateTasks && (
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplikovať
                </DropdownMenuItem>
              )}
              {canDeleteTasks && (
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Vymazať
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Compact Task Header */}
      <Card className="bg-card border border-border shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Title and Project Info */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {deadlineBadge && 
                   deadlineStatus?.type === 'today' &&
                   task.status !== "done" && 
                   task.status !== "cancelled" && 
                   task.project &&
                    (task.project as any).status !== "completed" &&
                    (task.project as any).status !== "cancelled" && (
                    <Flame className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                  <h1 className="text-2xl font-bold text-foreground truncate">{task.title}</h1>
                </div>
              </div>
            </div>

            {/* All Metadata in One Row */}
            <div className="pt-4 border-t border-border">
              <div className="flex flex-wrap items-start gap-6">
                {/* Status */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    Status
                  </div>
                  <StatusSelect 
                    status={task.status} 
                    onStatusChange={handleStatusChange}
                    disabled={!canUpdateTasks}
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Priorita
                  </div>
                  <PrioritySelect 
                    priority={task.priority} 
                    onPriorityChange={handlePriorityChange}
                    disabled={!canUpdateTasks}
                  />
                </div>

                {/* Date Range (Start Date - Deadline) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Dátum
                  </div>
                  <DateRangePicker
                    startDate={task.start_date}
                    endDate={task.due_date}
                    onSave={async (startDate, endDate) => {
                      await Promise.all([
                        handleStartDateChange(startDate),
                        handleDueDateChange(endDate),
                      ]);
                    }}
                    placeholder="Nastaviť dátum"
                    disabled={!canUpdateTasks}
                  />
                </div>

                {/* Assignees */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4" />
                    Priradení
                  </div>
                  <MultiAssigneeSelect
                    taskId={task.id}
                    currentAssignees={assignees}
                    onAssigneesChange={handleAssigneesChange}
                    disabled={!canUpdateTasks}
                  />
                </div>

                {/* Tracked Time */}
                {canReadTimeEntries && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      Natrackovaný čas
                    </div>
                    <div className="flex items-stretch gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-2 h-[2.5rem] bg-muted rounded-md text-sm border border-border">
                        {(() => {
                          const actualHours = task.actual_hours || 0;
                          const estimatedHours = task.estimated_hours || 0;
                          const isOverBudget = estimatedHours > 0 && actualHours > estimatedHours;
                          
                          // If both are 0, show nothing
                          if (actualHours === 0 && estimatedHours === 0) {
                            return <span className="text-muted-foreground italic">—</span>;
                          }
                          
                          return (
                            <>
                              {/* Estimated Hours (nabudgetovaný) - only show if > 0 */}
                              {estimatedHours > 0 && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Euro className={cn(
                                      "h-3.5 w-3.5",
                                      isOverBudget ? "text-red-500" : "text-muted-foreground"
                                    )} />
                                    <span className={cn(
                                      isOverBudget ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"
                                    )}>
                                      {formatHours(estimatedHours)}
                                    </span>
                                  </div>
                                  
                                  {/* Separator - only show if both values exist */}
                                  {actualHours > 0 && (
                                    <span className={cn(
                                      isOverBudget ? "text-red-500" : "text-muted-foreground"
                                    )}>/</span>
                                  )}
                                </>
                              )}
                              
                              {/* Actual Hours (natrackovaný) - always show if > 0 */}
                              {actualHours > 0 && (
                                <div className="flex items-center gap-1">
                                  <Timer className={cn(
                                    "h-3.5 w-3.5",
                                    isOverBudget ? "text-red-500" : "text-muted-foreground"
                                  )} />
                                  <span className={cn(
                                    isOverBudget ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"
                                  )}>
                                    {formatHours(actualHours)}
                                  </span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <button
                        type="button"
                        onClick={handleTimerToggle}
                        disabled={isStartingTimer}
                        className={cn(
                          "flex items-center justify-center w-10 h-[2.5rem] rounded-full bg-black text-white cursor-pointer hover:bg-black/80 transition-colors",
                          activeTimer && activeTimer.task_id === task.id && "bg-red-600 hover:bg-red-700",
                          isStartingTimer && "opacity-50 cursor-not-allowed"
                        )}
                        title={activeTimer && activeTimer.task_id === task.id ? "Zastaviť trackovanie" : "Začať trackovať"}
                      >
                        {isStartingTimer ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : activeTimer && activeTimer.task_id === task.id ? (
                          <Square className="h-4 w-4 text-white" />
                        ) : (
                          <Play className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Left Column - Main Content */}
        <div className="flex-1 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="overview" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Prehľad</span>
              </TabsTrigger>
              {canReadTimeEntries && (
                <TabsTrigger value="time" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Čas</span>
                </TabsTrigger>
              )}
              {canViewCosts && (
                <TabsTrigger value="costs" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <Euro className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Náklady</span>
                </TabsTrigger>
              )}
              {canUpdateTasks && (
                <TabsTrigger value="settings" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Nastavenia</span>
                </TabsTrigger>
              )}
              {canViewReports && (
                <TabsTrigger value="report" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Report</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Description */}
              <Card className="bg-card border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Popis úlohy
                    </CardTitle>
                    {isSaving && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Ukladám...
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <FileUploadHandler
                    taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
                    onFileUploaded={() => {
                      // File uploaded successfully
                    }}
                  >
                    <QuillEditor
                      key={task?.id}
                      content={descriptionHtml}
                      onChange={handleDescriptionChange}
                      placeholder="Napíšte popis úlohy..."
                      className="min-h-[150px]"
                      editable={isEditing}
                      taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
                    />
                  </FileUploadHandler>
                </CardContent>
              </Card>

              {/* Task Checklist */}
              <TaskChecklist taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId} />

              {/* Task Files */}
              <TaskFiles taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId} />
            </TabsContent>

            {canReadTimeEntries && (
              <TabsContent value="time" className="mt-4">
                <Card className="bg-card border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Časové záznamy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <TimePanel 
                      projectId={Array.isArray(params.projectId) ? params.projectId[0] : params.projectId} 
                      tasks={[{
                        ...task,
                        project_name: task.project?.name || "Neznámy projekt",
                        project_id: task.project_id
                      }]} 
                      defaultTaskId={task.id}
                      onTimeEntryAdded={() => {
                        fetchTask();
                        window.dispatchEvent(new CustomEvent('timeEntryAdded'));
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {canViewCosts && (
              <TabsContent value="costs" className="mt-4">
                <Card className="bg-card border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Euro className="h-4 w-4" />
                      Náklady
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {task && (
                      <CostsPanel 
                        projectId={task.project_id || (Array.isArray(params.projectId) ? params.projectId[0] : params.projectId)} 
                        tasks={[task]}
                        defaultTaskId={task.id}
                        onCostAdded={() => {
                          fetchTask();
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {canUpdateTasks && (
              <TabsContent value="settings" className="space-y-4 mt-4">
                {/* Time Settings */}
                <Card className="bg-card border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Časové nastavenia
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Estimated Hours */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Odhad hodín</label>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          value={task?.estimated_hours || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : null;
                            setTask(prev => prev ? { ...prev, estimated_hours: value } : null);
                            setHasChanges(true);
                          }}
                          placeholder="0"
                          className="w-full"
                        />
                      </div>

                    {/* Actual Hours - Read Only */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Natrackovaný čas</label>
                      <div className="px-3 py-2 bg-muted rounded-md text-sm text-foreground">
                        {task?.actual_hours ? `${task.actual_hours}h` : '0h'}
                      </div>
                    </div>

                    {/* Hourly Rate - Read Only */}
                    {canViewHourlyRates && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Hodinovka projektu</label>
                        <div className="px-3 py-2 bg-muted rounded-md text-sm text-foreground">
                          {task?.project?.hourly_rate ? `${task.project.hourly_rate.toFixed(2)}€/h` : 'Nenastavené'}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Budget Settings */}
              {canViewPrices && (
                <Card className="bg-card border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Rozpočtové nastavenia
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Rozpočet úlohy</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={task?.budget_cents ? (task.budget_cents / 100).toString() : ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null;
                          const budgetCents = value ? Math.round(value * 100) : null;
                          setTask(prev => prev ? { 
                            ...prev, 
                            budget_cents: budgetCents
                          } : null);
                          setHasChanges(true);
                        }}
                        placeholder="0.00"
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground">€</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Individuálny rozpočet tejto úlohy. Nechajte prázdne pre výpočet z hodín.
                    </p>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Project Info */}
              <Card className="bg-card border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground">Informácie o projekte</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{task.project?.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{task.project?.code}</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-muted-foreground hover:text-foreground"
                      onClick={() => router.push(`/projects/${params.projectId}`)}
                    >
                      Zobraziť projekt
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              {hasChanges && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Ukladám...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Uložiť nastavenia
                      </>
                    )}
                  </Button>
                </div>
              )}
              </TabsContent>
            )}

            {canViewReports && (
              <TabsContent value="report" className="mt-4">
                <Card className="bg-card border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {task && (
                      <ProjectReport 
                        projectId={task.project_id || (Array.isArray(params.projectId) ? params.projectId[0] : params.projectId)}
                        taskId={task.id}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-80 space-y-4 order-first xl:order-last">
          <Tabs value={rightSidebarTab} onValueChange={setRightSidebarTab} className="w-full">
            <TabsList className="inline-flex h-9 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              {canReadComments && (
                <TabsTrigger value="comments" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Komentáre</span>
                  {commentsCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                      {commentsCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="links" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Link className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Linky</span>
                {linksCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                    {linksCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {canReadComments && (
              <TabsContent value="comments" className="mt-4">
                <Card className="bg-card border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Komentáre
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CommentsList 
                      taskId={task.id}
                      onCommentAdded={() => {
                        // Refresh comments count when comment is added
                        fetchCommentsCount();
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="links" className="mt-4">
              <Card className="bg-card border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Google Drive
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <GoogleDriveLinks 
                    taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
                    onLinksChange={() => {
                      // Refresh links count when link is added/deleted
                      fetchLinksCount();
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}