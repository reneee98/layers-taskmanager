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
  Flame,
  Folder,
  Hash
} from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy load heavy components
const TimePanel = dynamic(() => import("@/components/time/TimePanel").then(mod => ({ default: mod.TimePanel })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const TaskTimeTab = dynamic(() => import("@/components/tasks/TaskTimeTab").then(mod => ({ default: mod.TaskTimeTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const TaskFinancePanel = dynamic(() => import("@/components/finance/TaskFinancePanel").then(mod => ({ default: mod.TaskFinancePanel })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const TaskHistoryPanel = dynamic(() => import("@/components/tasks/TaskHistoryPanel").then(mod => ({ default: mod.TaskHistoryPanel })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const TaskSettingsPanel = dynamic(() => import("@/components/tasks/TaskSettingsPanel").then(mod => ({ default: mod.TaskSettingsPanel })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const ProjectReport = dynamic(() => import("@/components/report/ProjectReport").then(mod => ({ default: mod.ProjectReport })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const ProjectStatusCard = dynamic(() => import("@/components/projects/ProjectStatusCard").then(mod => ({ default: mod.ProjectStatusCard })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const CommentsList = dynamic(() => import("@/components/comments/CommentsList").then(mod => ({ default: mod.CommentsList })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const TaskDescription = dynamic(() => import("@/components/tasks/TaskDescription").then(mod => ({ default: mod.TaskDescription })), {
  loading: () => <div className="h-32 bg-muted animate-pulse rounded"></div>,
  ssr: false,
});

// Status component for TaskDescription
const TaskDescriptionStatus = ({ taskId }: { taskId: string }) => {
  const [status, setStatus] = useState<"idle" | "typing" | "saving" | "saved" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleStatusChange = (newStatus: "idle" | "typing" | "saving" | "saved" | "error", text: string) => {
      setStatus(newStatus);
      setStatusText(text);
      if (newStatus === "error") {
        setError(text);
      } else {
        setError(null);
      }
    };

    // Listen for custom events from TaskDescription
    const handleCustomStatusChange = (e: CustomEvent) => {
      handleStatusChange(e.detail.status, e.detail.text);
    };

    window.addEventListener(`task-description-status-${taskId}` as any, handleCustomStatusChange as EventListener);

    return () => {
      window.removeEventListener(`task-description-status-${taskId}` as any, handleCustomStatusChange as EventListener);
    };
  }, [taskId]);

  if (status === "idle") return null;

  const statusColor = status === "error" ? "text-red-500" : status === "saved" ? "text-green-500" : "text-muted-foreground";

  return (
    <div
      className={`text-xs ${statusColor} flex items-center gap-1`}
      title={error || undefined}
    >
      {statusText}
    </div>
  );
};

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

const ProjectQuickLinksSection = dynamic(() => import("@/components/projects/ProjectQuickLinksSection").then(mod => ({ default: mod.ProjectQuickLinksSection })), {
  loading: () => <div className="h-20 bg-muted animate-pulse rounded"></div>,
});

const TaskFilesGrid = dynamic(() => import("@/components/tasks/TaskFilesGrid").then(mod => ({ default: mod.TaskFilesGrid })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
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

const TaskShareButton = dynamic(() => import("@/components/tasks/TaskShareButton").then(mod => ({ default: mod.TaskShareButton })), {
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
import { useWorkspaceUsers } from "@/contexts/WorkspaceUsersContext";
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
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
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
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing] = useState(true); // Always in editing mode
  const [activeTab, setActiveTab] = useState("overview");
  const [rightSidebarTab, setRightSidebarTab] = useState(canReadComments ? "comments" : "links");
  const [hasChanges, setHasChanges] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [linksCount, setLinksCount] = useState(0);
  const [filesCount, setFilesCount] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isStartingTimer, setIsStartingTimer] = useState(false);
  const prevActiveTimerRef = useRef<typeof activeTimer>(null);
  const [projectSelectOpen, setProjectSelectOpen] = useState(false);
  const { users: workspaceUsers, loading: workspaceUsersLoading } = useWorkspaceUsers();

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const fetchTask = async () => {
    if (!taskId) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      
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
    if (!taskId) return;
    try {
      const response = await fetch(`/api/tasks/${taskId}/assignees`);
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
      const response = await fetch(`/api/tasks/${taskId}/comments`);
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
      const response = await fetch(`/api/tasks/${taskId}/drive-links`);
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

  const fetchFilesCount = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/files`);
      const result = await response.json();
      if (result.success && result.data) {
        setFilesCount(result.data?.length || 0);
      } else {
        setFilesCount(0);
      }
    } catch (error) {
      setFilesCount(0);
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
        fetchFilesCount(),
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
  }, [taskId, canReadComments]);

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
          body: JSON.stringify({ assigneeIds }),
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
      // Note: description is now saved automatically by TaskDescription component
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


  const handleAssigneesChange = (newAssignees: TaskAssignee[]) => {
    setAssignees(newAssignees);
  };

  const handleStatusChange = async (newStatus: "todo" | "in_progress" | "review" | "sent_to_client" | "done" | "cancelled") => {
    if (!task) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
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
          detail: { taskId: taskId, status: newStatus } 
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
      const response = await fetch(`/api/tasks/${taskId}`, {
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
      const response = await fetch(`/api/tasks/${taskId}`, {
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
      const response = await fetch(`/api/tasks/${taskId}`, {
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
      const response = await fetch(`/api/tasks/${taskId}`, {
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
      const response = await fetch(`/api/tasks/${taskId}`, {
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

        const trackedHours = duration > 0 ? Number((duration / 3600).toFixed(3)) : 0;
        await stopTimer();

        if (trackedHours > 0) {
          toast({
            title: "Časovač zastavený",
            description: `Zapísaných ${formatHours(trackedHours)} do úlohy.`,
          });
        }

        // Refresh task to update actual_hours (API updates it server-side)
        await new Promise((resolve) => setTimeout(resolve, 300));
        fetchTask();
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

        await stopTimer();

        if (trackedHours > 0) {
          toast({
            title: "Predchádzajúci časovač uložený",
            description: `Zapísaných ${formatHours(trackedHours)} do úlohy "${activeTimer.task_name}".`,
          });
        }
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
    <div className="relative min-h-screen -mx-3 sm:-mx-4 md:-mx-6 -my-3 sm:-my-4 md:-my-6">
      {/* Fixed Header - Figma 1:1 */}
      <div className="sticky top-0 z-50 bg-[rgba(255,255,255,0.8)] dark:bg-[rgba(24,24,27,0.8)] border-b border-[rgba(226,232,240,0.8)] dark:border-border backdrop-blur-sm pt-4 px-6 pb-4">
        <div className="flex h-8 items-center justify-between w-full">
          {/* Left side - Back button and breadcrumb */}
          <div className="flex gap-4 items-center h-8">
            {/* Back Button */}
            <button
              onClick={() => router.push(`/projects/${params.projectId}`)}
              className="h-8 rounded-lg flex items-center gap-2 px-2.5 hover:bg-[#f1f5f9] dark:hover:bg-muted transition-colors"
              aria-label="Späť na projekt"
              tabIndex={0}
            >
              <ArrowLeft className="h-4 w-4 text-[#62748e] dark:text-muted-foreground" />
              <span className="text-sm font-medium text-[#62748e] dark:text-muted-foreground tracking-[-0.15px]">Späť</span>
            </button>

            {/* Divider */}
            <div className="bg-[#e2e8f0] dark:bg-border h-4 w-px shrink-0" />

            {/* Breadcrumb */}
            <div className="flex gap-2 items-center h-7">
              {task.project ? (
                <>
                  {/* Project name with folder icon */}
                  <Popover open={canUpdateTasks ? projectSelectOpen : false} onOpenChange={canUpdateTasks ? setProjectSelectOpen : undefined}>
                    <PopoverTrigger asChild>
                      <button
                        disabled={!canUpdateTasks}
                        className={cn(
                          "flex gap-1.5 items-center px-2 h-7 rounded-lg transition-colors",
                          canUpdateTasks ? "hover:bg-[#f1f5f9] dark:hover:bg-muted cursor-pointer" : "cursor-default"
                        )}
                      >
                        <Folder className="h-3 w-3 text-[#45556c] dark:text-foreground shrink-0" />
                        <span className="text-sm font-medium text-[#45556c] dark:text-foreground tracking-[-0.15px]">
                          {task.project.name}
                        </span>
                      </button>
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

                  {/* Slash separator */}
                  <span className="text-sm text-[#cad5e2] dark:text-muted-foreground tracking-[-0.15px]">/</span>

                  {/* Task code with hash icon */}
                  <div className="flex items-center h-5 rounded hover:bg-[#f1f5f9] dark:hover:bg-muted transition-colors">
                    <div className="flex items-center gap-1 px-1.5">
                      <Hash className="h-2.5 w-2.5 text-[#90a1b9] dark:text-muted-foreground shrink-0" />
                      <span className="text-xs font-bold text-[#90a1b9] dark:text-muted-foreground leading-4">
                        {task.project.code}-{String(task.id).slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Bez projektu</span>
              )}
            </div>
          </div>

          {/* Right side - Timer, Share, Save */}
          <div className="flex gap-3 items-center h-8">
            {/* Timer Widget */}
            <div className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-lg shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] h-8 flex items-center overflow-hidden flex-1 min-w-[140px]">
              {/* Timer icon section */}
              <div className="h-[30px] w-[35px] border-r border-[#f1f5f9] dark:border-border flex items-center justify-center shrink-0">
                <Timer className="h-3.5 w-3.5 text-[#62748e] dark:text-muted-foreground" />
              </div>

              {/* Time display */}
              <div className="flex-1 flex items-center px-3">
                <span className="text-xs font-bold text-[#314158] dark:text-foreground leading-4 tabular-nums">
                  {activeTimer && activeTimer.task_id === task.id 
                    ? (() => {
                        const seconds = Math.floor((Date.now() - new Date(activeTimer.started_at).getTime()) / 1000);
                        const hrs = Math.floor(seconds / 3600);
                        const mins = Math.floor((seconds % 3600) / 60);
                        const secs = seconds % 60;
                        return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
                      })()
                    : "0:00:00"}
                </span>
              </div>

              {/* Play/Stop button section */}
              <button
                onClick={handleTimerToggle}
                disabled={isStartingTimer}
                className="h-[30px] w-[37px] border-l border-[#f1f5f9] dark:border-border flex items-center justify-center shrink-0 hover:bg-[#f1f5f9] dark:hover:bg-muted transition-colors disabled:opacity-50"
                aria-label={activeTimer && activeTimer.task_id === task.id ? "Zastaviť časovač" : "Spustiť časovač"}
                tabIndex={0}
              >
                {activeTimer && activeTimer.task_id === task.id ? (
                  <Square className="h-3 w-3 text-[#62748e] dark:text-muted-foreground" />
                ) : (
                  <Play className="h-3 w-3 text-[#62748e] dark:text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Share button - Figma 1:1 */}
            <TaskShareButton taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId} compact />

            {/* Save button - always visible per Figma */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="bg-[#0f172b] dark:bg-primary hover:bg-[#0f172b]/90 dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed h-8 rounded-lg shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] px-4 flex items-center justify-center shrink-0 transition-colors"
              aria-label="Uložiť zmeny"
              tabIndex={0}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              ) : (
                <span className="text-xs font-medium text-white leading-4">Uložiť zmeny</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-6 px-6 pb-6">

      {/* Task Header - Figma Design */}
      <div className="flex flex-col gap-5">
        {/* Title */}
        <div className="h-[37.5px] min-w-0">
          <h1 className="font-bold leading-[37.5px] text-[#0f172b] dark:text-foreground text-[30px] tracking-[-0.3545px] truncate">
            {task.title}
          </h1>
        </div>

        {/* Metadata Row - Figma Design */}
        <div className="flex gap-5 items-center flex-wrap mb-3">
          {/* Assignees */}
          <div className="flex items-start pl-0 pr-[6px] py-0 relative shrink-0">
            {assignees.slice(0, 3).map((assignee, idx) => {
              const assigneeName = (assignee as any).display_name || (assignee as any).user?.name || (assignee as any).email || "";
              return (
                <div
                  key={assignee.user_id || idx}
                  className="bg-[#f1f5f9] dark:bg-slate-700 border-2 border-solid border-white dark:border-slate-800 flex items-start mr-[-6px] overflow-clip p-[2px] relative rounded-full shadow-[0px_0px_0px_1px_#f1f5f9] dark:shadow-[0px_0px_0px_1px_#334155] shrink-0 size-[28px]"
                >
                  <div className="bg-[#ececf0] dark:bg-slate-600 h-[24px] w-[24px] rounded-full shrink-0 flex items-center justify-center">
                    <span className="font-normal leading-[14.286px] text-[#45556c] dark:text-slate-300 text-[10px] tracking-[0.1172px]">
                      {getInitials(assigneeName)}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Add assignee button */}
            {canUpdateTasks && (
              <div className="mr-[-6px] relative shrink-0">
                <MultiAssigneeSelect
                  taskId={task.id}
                  currentAssignees={assignees}
                  onAssigneesChange={handleAssigneesChange}
                  disabled={!canUpdateTasks}
                  compact={true}
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="bg-[rgba(202,213,226,0.5)] dark:bg-border h-4 shrink-0 w-px" />

          {/* Date, Status, Priority badges */}
          <div className="flex gap-3 items-center relative shrink-0">
            {/* Date badge */}
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

            {/* Status badge */}
            <StatusSelect 
              status={task.status} 
              onStatusChange={handleStatusChange}
              disabled={!canUpdateTasks}
              size="default"
            />

            {/* Priority badge */}
            <PrioritySelect 
              priority={task.priority} 
              onPriorityChange={handlePriorityChange}
              disabled={!canUpdateTasks}
              size="default"
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="overview" className="relative">
              Prehľad
            </TabsTrigger>
            <TabsTrigger value="files" className="relative">
              Súbory
              {filesCount > 0 && (
                <span className="ml-1.5 bg-[rgba(226,232,240,0.5)] dark:bg-muted-foreground/30 text-[#62748e] dark:text-muted-foreground text-[9px] font-semibold leading-[12px] px-1 py-0 rounded-full h-[14px] flex items-center">
                  {filesCount}
                </span>
              )}
            </TabsTrigger>
            {canReadTimeEntries && (
              <TabsTrigger value="time" className="relative">
                Čas
                {task?.actual_hours != null && task.actual_hours > 0 && (
                  <span className="ml-1.5 bg-[rgba(226,232,240,0.5)] dark:bg-muted-foreground/30 text-[#62748e] dark:text-muted-foreground text-[9px] font-semibold leading-[12px] px-[4px] py-0 rounded-full h-[14px] flex items-center">
                    {task.actual_hours.toFixed(1)}h
                  </span>
                )}
              </TabsTrigger>
            )}
            {canViewCosts && (
              <TabsTrigger value="financie">
                Financie
              </TabsTrigger>
            )}
            <TabsTrigger value="history">
              História
            </TabsTrigger>
            {canUpdateTasks && (
              <TabsTrigger value="settings">
                Nastavenia
              </TabsTrigger>
            )}
          </TabsList>

          {/* Main Content - two column on large screens, single column on smaller */}
          <div className="flex flex-col 2xl:flex-row gap-6 mt-4 items-start">
            {/* Left Column - Main Content */}
            <div className="flex-1 w-full space-y-6">
              <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Description - Figma Design */}
              <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                <CardHeader className="h-[71px] pb-0 pt-4 px-6 border-b border-[#f1f5f9] dark:border-border">
                  <div className="flex items-center justify-between h-[24px]">
                    <div className="flex items-center gap-6">
                      <FileText className="h-4 w-4 text-[#0f172b] dark:text-foreground" />
                      <CardTitle className="text-[14px] font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px] m-0">
                        Zadanie & Špecifikácia
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-3 text-[12px] font-medium text-[#90a1b9] dark:text-muted-foreground hover:text-[#0f172b] dark:hover:text-foreground"
                      onClick={() => {
                        // Trigger edit mode for TaskDescription
                        const event = new CustomEvent('editTaskDescription');
                        window.dispatchEvent(event);
                      }}
                    >
                      Upraviť
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 px-6 pb-6">
                  <FileUploadHandler
                    taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
                    onFileUploaded={(fileUrl, htmlContent) => {
                      // Files are automatically added to Files section via custom event
                      // No need to modify description
                    }}
                  >
                    <TaskDescription
                      taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
                      initialDescription={task?.description || ""}
                    />
                  </FileUploadHandler>
                </CardContent>
              </Card>

              {/* Task Checklist */}
              <TaskChecklist taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId} />
            </TabsContent>

            {canReadTimeEntries && (
              <TabsContent value="time" className="mt-4">
                <TaskTimeTab 
                  taskId={task.id}
                  projectId={Array.isArray(params.projectId) ? params.projectId[0] : params.projectId}
                  onTimeEntryAdded={() => {
                    fetchTask();
                    window.dispatchEvent(new CustomEvent('timeEntryAdded'));
                  }}
                />
              </TabsContent>
            )}

            <TabsContent value="files" className="mt-4">
              <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                <CardHeader className="pb-4 pt-5 px-5">
                  <CardTitle className="text-[11px] font-bold text-[#90a1b9] dark:text-muted-foreground tracking-[0.6145px] uppercase m-0">
                    Súbory
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-5 pb-5">
                  <TaskFilesGrid 
                    taskId={task.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {canViewCosts && (
              <TabsContent value="financie" className="mt-4">
                {task ? (
                  <TaskFinancePanel taskId={task.id} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Načítavam úlohu...
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="history" className="mt-4">
              {task && (
                <TaskHistoryPanel taskId={task.id} />
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              {task && (
                <TaskSettingsPanel
                  taskId={task.id}
                  task={{
                    id: task.id,
                    title: task.title,
                    project_id: task.project_id || null,
                    budget_cents: task.budget_cents || null,
                    sales_commission_enabled: (task as any).sales_commission_enabled,
                    sales_commission_user_id: (task as any).sales_commission_user_id || null,
                    sales_commission_percent: (task as any).sales_commission_percent || null,
                  }}
                  projects={projects}
                  onTaskUpdate={fetchTask}
                />
              )}
            </TabsContent>
            {false && canUpdateTasks && (
              <TabsContent value="settings-old" className="space-y-4 mt-4">
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

              {/* Save Button - OLD - DISABLED */}
              {false && hasChanges && (
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
            </div>

            {/* Right Sidebar - full width on small, fixed width on 2xl+ */}
            <div className="w-full 2xl:w-80 space-y-6 shrink-0">
              {/* Status projektu Card - Figma Design */}
              {task.project_id && canViewReports && (
                <ProjectStatusCard 
                  projectId={task.project_id}
                  taskId={task.id}
                  assignees={assignees}
                />
              )}
              
              {/* Rýchle odkazy */}
              {task.id && (
                <ProjectQuickLinksSection taskId={task.id} />
              )}
            </div>
          </div>
        </Tabs>
      </div>
      </div>
    </div>
  );
}