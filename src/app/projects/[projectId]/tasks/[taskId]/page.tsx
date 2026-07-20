"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageState } from "@/components/layout/page-state";

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

const TaskSettingsPanel = dynamic(() => import("@/components/tasks/TaskSettingsPanel").then(mod => ({ default: mod.TaskSettingsPanel })), {
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
import { formatHours, formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { Task, TaskAssignee } from "@/types/database";
import { cn } from "@/lib/utils";
import { getDeadlineStatus, getDeadlineBadge } from "@/lib/deadline-utils";
import { normalizeCurrency } from "@/lib/currency";
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
  const timerDescriptionDraftKey = `active-timer-description-${taskId || "unknown-task"}`;
  const { activeTimer, currentDuration, startTimer, stopTimer, refreshTimer } = useTimer();
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
  const [timerDescription, setTimerDescription] = useState("");
  const [isExtraMode, setIsExtraMode] = useState(false);
  const descriptionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { users: workspaceUsers, loading: workspaceUsersLoading } = useWorkspaceUsers();
  const persistTimerDescription = useCallback(async (description: string, keepalive = false) => {
    try {
      const response = await fetch("/api/timers/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
        keepalive,
      });

      if (!response.ok) {
        console.error("Failed to persist timer description:", response.status);
      }
    } catch (error) {
      console.error("Failed to update timer description:", error);
    }
  }, []);

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

  // Sync description and extra mode from active timer
  useEffect(() => {
    if (!activeTimer || !task || String(activeTimer.task_id) !== String(task.id)) {
      return;
    }

    const serverDescription = activeTimer.description || "";
    const draftDescription = localStorage.getItem(timerDescriptionDraftKey) || "";
    const resolvedDescription = draftDescription || serverDescription;

    if (resolvedDescription !== timerDescription) {
      setTimerDescription(resolvedDescription);
    }

    // Push local draft to backend if it's newer than server value.
    if (draftDescription && draftDescription !== serverDescription) {
      void persistTimerDescription(draftDescription);
    }

    setIsExtraMode(activeTimer.is_extra === true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimer?.id, activeTimer?.description, task?.id, timerDescriptionDraftKey]);

  useEffect(() => {
    const isTimerRunningForTask = !!(
      activeTimer &&
      task &&
      String(activeTimer.task_id) === String(task.id)
    );

    if (!isTimerRunningForTask && !activeTimer) {
      localStorage.removeItem(timerDescriptionDraftKey);
      setTimerDescription("");
    }
  }, [activeTimer?.id, task?.id, timerDescriptionDraftKey]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (descriptionUpdateTimeoutRef.current) {
        clearTimeout(descriptionUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Flush pending timer description before page refresh/navigation.
  useEffect(() => {
    const isTimerRunningForTask = !!(
      activeTimer &&
      task &&
      String(activeTimer.task_id) === String(task.id)
    );

    if (!isTimerRunningForTask) {
      return;
    }

    const handleBeforeUnload = () => {
      if (descriptionUpdateTimeoutRef.current) {
        clearTimeout(descriptionUpdateTimeoutRef.current);
      }

      const serverDescription = activeTimer.description || "";
      if (timerDescription !== serverDescription) {
        void persistTimerDescription(timerDescription, true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeTimer?.id, activeTimer?.description, task?.id, timerDescription, persistTimerDescription]);

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

  const handleDateRangeChange = async (
    newStartDate: string | null,
    newDueDate: string | null
  ) => {
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_date: newStartDate,
          due_date: newDueDate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTask((currentTask) =>
          currentTask
            ? {
                ...currentTask,
                start_date: result.data?.start_date ?? newStartDate,
                due_date: result.data?.due_date ?? newDueDate,
              }
            : currentTask
        );
        toast({
          title: "Úspech",
          description: "Termín úlohy bol aktualizovaný",
        });
        // Dispatch event to refresh dashboard
        window.dispatchEvent(new CustomEvent('taskStatusChanged', { 
          detail: { taskId: params.taskId } 
        }));
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa aktualizovať termín úlohy",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating task date range:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať termín úlohy",
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

  const handleTimerToggle = async () => {
    if (!task) return;

    // Check if timer is running for this task (either regular or extra)
    const isTimerRunningForThisTask = activeTimer && String(activeTimer.task_id) === String(task.id);

    // If timer is running for this task, stop it
    if (isTimerRunningForThisTask) {
      try {
        const startedAt = new Date(activeTimer.started_at);
        const now = new Date();
        const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const trackedHours = duration > 0 ? Number((duration / 3600).toFixed(3)) : 0;
        const wasExtra = activeTimer.is_extra === true;
        
        await stopTimer();
        setTimerDescription("");
        localStorage.removeItem(timerDescriptionDraftKey);

        if (trackedHours > 0) {
          toast({
            title: wasExtra ? "Extra časovač zastavený" : "Časovač zastavený",
            description: `Zapísaných ${formatHours(trackedHours)} do ${wasExtra ? "extra času" : "úlohy"}.`,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
        fetchTask();
        
        // Dispatch event to refresh time entries in TaskTimeTab
        window.dispatchEvent(new CustomEvent('timerStopped'));
      } catch (error) {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa zastaviť časovač",
          variant: "destructive",
        });
      }
      return;
    }

    // If another task is being tracked, stop it first
    if (activeTimer) {
      try {
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

    // Start tracking this task with current mode (extra or regular)
    try {
      setIsStartingTimer(true);
      await startTimer(
        task.id,
        task.title,
        task.project_id,
        task.project?.name || "Neznámy projekt",
        isExtraMode, // Pass extra mode
        timerDescription || undefined // Pass description
      );
      toast({
        title: isExtraMode ? "Extra časovač spustený" : "Časovač spustený",
        description: `Začal som trackovať ${isExtraMode ? "extra " : ""}čas pre úlohu "${task.title}"`,
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

  // Update timer's extra mode while running
  const handleToggleExtraMode = async () => {
    const isTimerRunning = activeTimer && task && String(activeTimer.task_id) === String(task.id);
    
    if (isTimerRunning) {
      // Timer is running - update it in database
      const newExtraMode = !(activeTimer.is_extra === true);
      try {
        const response = await fetch("/api/timers/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_extra: newExtraMode }),
        });
        
        if (response.ok) {
          await refreshTimer();
          toast({
            title: newExtraMode ? "Prepnuté na extra čas" : "Prepnuté na normálny čas",
            description: newExtraMode ? "Čas sa zapíše ako extra (mimo scope)" : "Čas sa zapíše do úlohy",
          });
        }
      } catch (error) {
        console.error("Failed to update timer mode:", error);
      }
    } else {
      // Timer not running - just toggle local state
      setIsExtraMode(!isExtraMode);
    }
  };

  // Update timer's description while running (debounced)
  const handleDescriptionChange = (value: string) => {
    setTimerDescription(value);
    localStorage.setItem(timerDescriptionDraftKey, value);
    
    const isTimerRunning = !!(
      activeTimer &&
      task &&
      String(activeTimer.task_id) === String(task.id)
    );
    
    if (isTimerRunning) {
      // Debounce the API call
      if (descriptionUpdateTimeoutRef.current) {
        clearTimeout(descriptionUpdateTimeoutRef.current);
      }
      
      descriptionUpdateTimeoutRef.current = setTimeout(async () => {
        await persistTimerDescription(value);
      }, 500);
    }
  };

  const handleExtraTimerToggle = async () => {
    if (!task) return;

    // If extra time is currently being tracked for this task, stop it
    if (activeTimer && String(activeTimer.task_id) === String(task.id) && activeTimer.is_extra === true) {
      try {
        const startedAt = new Date(activeTimer.started_at);
        const now = new Date();
        const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const trackedHours = duration > 0 ? Number((duration / 3600).toFixed(3)) : 0;
        await stopTimer();

        if (trackedHours > 0) {
          toast({
            title: "Extra časovač zastavený",
            description: `Zapísaných ${formatHours(trackedHours)} extra času do úlohy.`,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
        fetchTask();
      } catch (error) {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa zastaviť extra časovač",
          variant: "destructive",
        });
      }
      return;
    }

    // If regular timer is active for this task, convert it to extra time
    if (activeTimer && String(activeTimer.task_id) === String(task.id) && !(activeTimer.is_extra === true)) {
      try {
        setIsStartingTimer(true);
        
        // Convert current timer to extra time using special endpoint
        const convertResponse = await fetch('/api/timers/convert-to-extra', {
          method: 'POST',
        });

        const convertResult = await convertResponse.json();
        
        if (!convertResult.success) {
          throw new Error(convertResult.error || "Failed to convert timer to extra");
        }

        const trackedHours = convertResult.data?.hours || 0;

        // Wait a bit for timer to stop
        await new Promise((resolve) => setTimeout(resolve, 300));
        await refreshTimer();

        // Start new extra timer
        await startTimer(
          task.id,
          task.title,
          task.project_id || "",
          task.project?.name || "Neznámy projekt",
          true // Extra time
        );
        await refreshTimer();
        
        if (trackedHours > 0) {
          toast({
            title: "Čas uložený ako extra",
            description: `Zapísaných ${formatHours(trackedHours)} ako extra čas a spustený nový extra časovač.`,
          });
        } else {
          toast({
            title: "Extra časovač spustený",
            description: `Začal som trackovať extra čas pre úlohu "${task.title}"`,
          });
        }

        await fetchTask();
      } catch (error) {
        console.error("Error converting timer to extra:", error);
        toast({
          title: "Chyba",
          description: error instanceof Error ? error.message : "Nepodarilo sa previesť časovač na extra",
          variant: "destructive",
        });
      } finally {
        setIsStartingTimer(false);
      }
      return;
    }

    // If another timer is active (different task), stop it first
    if (activeTimer) {
      try {
        const startedAt = new Date(activeTimer.started_at);
        const now = new Date();
        const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const trackedHours = Number((duration / 3600).toFixed(3));
        await stopTimer();

        if (trackedHours > 0) {
          const timerType = activeTimer.is_extra === true ? "extra časovač" : "časovač";
          toast({
            title: `Predchádzajúci ${timerType} uložený`,
            description: `Zapísaných ${formatHours(trackedHours)} do úlohy "${activeTimer.task_name}".`,
          });
        }
      } catch (error) {
        console.error("Error stopping previous timer:", error);
      }
    }

    // Start tracking extra time
    try {
      setIsStartingTimer(true);
      await startTimer(
        task.id,
        task.title,
        task.project_id || "",
        task.project?.name || "Neznámy projekt",
        true // Extra time
      );
      await refreshTimer();
      toast({
        title: "Extra časovač spustený",
        description: `Začal som trackovať extra čas pre úlohu "${task.title}"`,
      });
    } catch (error) {
      console.error("Error in handleExtraTimerToggle:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa spustiť extra časovač",
        variant: "destructive",
      });
    } finally {
      setIsStartingTimer(false);
    }
  };

  const handleStartExtraTimer = async () => {
    if (!task) return;

    // If extra timer is already running for this task, do nothing
    if (activeTimer && String(activeTimer.task_id) === String(task.id) && activeTimer.is_extra === true) {
      toast({
        title: "Extra časovač už beží",
        description: "Extra časovač pre túto úlohu už beží.",
      });
      return;
    }

    // If regular timer is active for this task, convert it to extra time
    if (activeTimer && String(activeTimer.task_id) === String(task.id) && !(activeTimer.is_extra === true)) {
      try {
        setIsStartingTimer(true);
        
        // Convert current timer to extra time using special endpoint
        const convertResponse = await fetch('/api/timers/convert-to-extra', {
          method: 'POST',
        });

        const convertResult = await convertResponse.json();
        
        if (!convertResult.success) {
          throw new Error(convertResult.error || "Failed to convert timer to extra");
        }

        const trackedHours = convertResult.data?.hours || 0;

        // Wait a bit for timer to stop
        await new Promise((resolve) => setTimeout(resolve, 300));
        await refreshTimer();

        // Start new extra timer
        await startTimer(
          task.id,
          task.title,
          task.project_id || "",
          task.project?.name || "Neznámy projekt",
          true // Extra time
        );
        await refreshTimer();
        
        if (trackedHours > 0) {
          toast({
            title: "Čas uložený ako extra",
            description: `Zapísaných ${formatHours(trackedHours)} ako extra čas a spustený nový extra časovač.`,
          });
        } else {
          toast({
            title: "Extra časovač spustený",
            description: `Začal som trackovať extra čas pre úlohu "${task.title}"`,
          });
        }

        await fetchTask();
      } catch (error) {
        console.error("Error converting timer to extra:", error);
        toast({
          title: "Chyba",
          description: error instanceof Error ? error.message : "Nepodarilo sa previesť časovač na extra",
          variant: "destructive",
        });
      } finally {
        setIsStartingTimer(false);
      }
      return;
    }

    // If another timer is active (different task), stop it first
    if (activeTimer) {
      try {
        const startedAt = new Date(activeTimer.started_at);
        const now = new Date();
        const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const trackedHours = Number((duration / 3600).toFixed(3));
        await stopTimer();

        if (trackedHours > 0) {
          const timerType = activeTimer.is_extra === true ? "extra časovač" : "časovač";
          toast({
            title: `Predchádzajúci ${timerType} uložený`,
            description: `Zapísaných ${formatHours(trackedHours)} do úlohy "${activeTimer.task_name}".`,
          });
        }
      } catch (error) {
        console.error("Error stopping previous timer:", error);
      }
    }

    // Start tracking extra time
    try {
      setIsStartingTimer(true);
      await startTimer(
        task.id,
        task.title,
        task.project_id || "",
        task.project?.name || "Neznámy projekt",
        true // Extra time
      );
      await refreshTimer();
      toast({
        title: "Extra časovač spustený",
        description: `Začal som trackovať extra čas pre úlohu "${task.title}"`,
      });
    } catch (error) {
      console.error("Error starting extra timer:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa spustiť extra časovač",
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
    return <PageState variant="loading" title="Načítavam detail úlohy" />;
  }

  if (!task) {
    return (
      <PageState
        variant={!canReadTasks ? "permission" : "error"}
        title={!canReadTasks ? "Nemáte prístup k tejto úlohe" : "Úloha nebola nájdená"}
        description={!canReadTasks ? "O prístup požiadajte správcu workspace." : "Úloha mohla byť odstránená alebo presunutá."}
      />
    );
  }

  const deadlineStatus = getDeadlineStatus(task.due_date);
  const deadlineBadge = getDeadlineBadge(deadlineStatus);
  const StatusIcon = getStatusIcon(task.status);
  const PriorityIcon = getPriorityIcon(task.priority);

  return (
    <div className="page-shell">
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="sticky top-[60px] z-40 rounded-xl border border-border bg-card/90 px-3 py-2.5 backdrop-blur-md sm:px-4">
        <div className="flex w-full items-center justify-between gap-2">
          {/* Left side - Back button and breadcrumb */}
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            {/* Back Button */}
            <button
              onClick={() => router.push(`/projects/${params.projectId}`)}
              className="h-8 rounded-lg flex items-center gap-2 px-2.5 hover:bg-muted dark:hover:bg-muted transition-colors"
              aria-label="Späť na projekt"
              tabIndex={0}
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Späť</span>
            </button>

            {/* Divider */}
            <div className="bg-secondary dark:bg-border h-4 w-px shrink-0" />

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
                          canUpdateTasks ? "hover:bg-muted dark:hover:bg-muted cursor-pointer" : "cursor-default"
                        )}
                      >
                        <Folder className="h-3 w-3 text-muted-foreground dark:text-foreground shrink-0" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-foreground">
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
                  <span className="text-sm text-muted-foreground/50 dark:text-muted-foreground">/</span>

                  {/* Task code with hash icon */}
                  <div className="flex items-center h-5 rounded hover:bg-muted dark:hover:bg-muted transition-colors">
                    <div className="flex items-center gap-1 px-1.5">
                      <Hash className="h-2.5 w-2.5 text-muted-foreground dark:text-muted-foreground shrink-0" />
                      <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground leading-4">
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
          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            {/* Timer Widget - Redesigned */}
            <div className="flex min-w-0 items-center gap-2">
              {/* Description Input */}
              <input
                type="text"
                value={timerDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Čo práve robíš..."
                className="hidden h-8 w-[180px] rounded-lg border border-border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:block"
                aria-label="Popis práce"
              />
              
              {/* Timer Controls */}
              <div className="flex h-8 items-center overflow-hidden rounded-lg border border-border bg-background">
                {/* Extra mode toggle (Zap) */}
                <button
                  onClick={handleToggleExtraMode}
                  className={`h-[30px] w-[35px] border-r border-border/60 dark:border-border flex items-center justify-center shrink-0 transition-colors hover:bg-muted dark:hover:bg-muted ${
                    isExtraMode || (activeTimer && String(activeTimer.task_id) === String(task?.id) && activeTimer.is_extra === true)
                      ? "bg-violet-50 dark:bg-violet-950/30 dark:bg-purple-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                      : ""
                  }`}
                  aria-label={isExtraMode ? "Extra mód zapnutý - čas sa zapíše do extra" : "Normálny mód - čas sa zapíše do úlohy"}
                  title={isExtraMode || (activeTimer && String(activeTimer.task_id) === String(task?.id) && activeTimer.is_extra === true) ? "Extra mód (čas mimo scope) - klikni pre prepnutie" : "Normálny mód - klikni pre prepnutie na extra"}
                  tabIndex={0}
                  type="button"
                >
                  <Zap className={`h-3.5 w-3.5 ${
                    isExtraMode || (activeTimer && String(activeTimer.task_id) === String(task?.id) && activeTimer.is_extra === true)
                      ? "text-brand dark:text-purple-400"
                      : "text-muted-foreground dark:text-muted-foreground"
                  }`} />
                </button>

                {/* Time display */}
                <div className="flex items-center px-3 min-w-[70px]">
                  <span className={`text-xs font-bold leading-4 tabular-nums ${
                    activeTimer && String(activeTimer.task_id) === String(task?.id)
                      ? activeTimer.is_extra === true
                        ? "text-brand dark:text-purple-400"
                        : "text-foreground dark:text-foreground"
                      : "text-foreground dark:text-foreground"
                  }`}>
                    {activeTimer && String(activeTimer.task_id) === String(task?.id)
                      ? (() => {
                          const hrs = Math.floor(currentDuration / 3600);
                          const mins = Math.floor((currentDuration % 3600) / 60);
                          const secs = currentDuration % 60;
                          return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
                        })()
                      : "0:00:00"}
                  </span>
                </div>

                {/* Play/Stop button */}
                <button
                  onClick={handleTimerToggle}
                  disabled={isStartingTimer || !task}
                  className={`h-[30px] w-[37px] border-l border-border/60 dark:border-border flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 ${
                    activeTimer && String(activeTimer.task_id) === String(task?.id)
                      ? "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                      : "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                  }`}
                  aria-label={activeTimer && String(activeTimer.task_id) === String(task?.id) ? "Zastaviť časovač" : "Spustiť časovač"}
                  tabIndex={0}
                >
                  {activeTimer && String(activeTimer.task_id) === String(task?.id) ? (
                    <Square className="h-3 w-3 text-red-600 dark:text-red-500" />
                  ) : (
                    <Play className="h-3 w-3 text-green-600 dark:text-green-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Share button - Figma 1:1 */}
            <TaskShareButton taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId} compact />

            {/* Save button - always visible per Figma */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-primary px-4 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Uložiť zmeny"
              tabIndex={0}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
              ) : (
                <span className="text-xs font-medium text-primary-foreground leading-4">Uložiť zmeny</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content: two-column ───────────────────────────────────── */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">

        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">

          {/* Task title */}
          <div className="surface-panel px-5 py-4">
            <div className="flex flex-wrap items-start gap-3">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0 mt-[9px]",
                  task.color ? "" : "bg-muted-foreground/30"
                )}
                style={task.color ? { backgroundColor: task.color } : undefined}
              />
              <h1 className="min-w-0 flex-1 text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
                {task.title}
              </h1>
              <Badge variant="outline" className="shrink-0 mt-0.5 text-[11px]">
                {normalizeCurrency(task.currency)}
              </Badge>
            </div>
          </div>

          {/* Description */}
          <Card className="rounded-xl border border-border bg-card shadow-none">
            <CardHeader className="border-b border-border px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <CardTitle className="m-0 text-sm font-semibold text-foreground">
                    Zadanie
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <TaskDescriptionStatus taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => window.dispatchEvent(new CustomEvent("editTaskDescription"))}
                  >
                    Upraviť
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <FileUploadHandler
                taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
                onFileUploaded={() => {}}
              >
                <TaskDescription
                  taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
                  initialDescription={task?.description || ""}
                />
              </FileUploadHandler>
            </CardContent>
          </Card>

          {/* Checklist */}
          <TaskChecklist taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId} />

          {/* Comments */}
          {canReadComments && (
            <Card className="rounded-xl border border-border bg-card shadow-none">
              <CardHeader className="border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <CardTitle className="m-0 text-sm font-semibold text-foreground">
                    Komentáre
                  </CardTitle>
                  {commentsCount > 0 && (
                    <span className="ml-1 flex h-[18px] items-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                      {commentsCount}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <CommentsList
                  taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
                />
              </CardContent>
            </Card>
          )}

          {/* ── Secondary tabs: Time / Files / Settings ────────────────── */}
          {(canReadTimeEntries || canViewCosts || canUpdateTasks) && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border border-border bg-muted/[0.16] p-1 [&>*]:shrink-0">
                {(canReadTimeEntries || canViewCosts) && (
                  <TabsTrigger value="time" className="relative">
                    Čas a rozpočet
                    {task?.actual_hours != null && task.actual_hours > 0 && (
                      <span className="ml-1.5 flex h-[14px] items-center rounded-full bg-border/50 px-1 text-[9px] font-semibold text-muted-foreground">
                        {task.actual_hours.toFixed(1)}h
                      </span>
                    )}
                  </TabsTrigger>
                )}
                <TabsTrigger value="files" className="relative">
                  Podklady
                  {filesCount > 0 && (
                    <span className="ml-1.5 flex h-[14px] items-center rounded-full bg-border/50 px-1 text-[9px] font-semibold text-muted-foreground">
                      {filesCount}
                    </span>
                  )}
                </TabsTrigger>
                {canUpdateTasks && (
                  <TabsTrigger value="settings">Nastavenia</TabsTrigger>
                )}
              </TabsList>

              {(canReadTimeEntries || canViewCosts) && (
                <TabsContent value="time" className="mt-4 space-y-5">
                  {canReadTimeEntries && (
                    <TaskTimeTab
                      taskId={task.id}
                      projectId={Array.isArray(params.projectId) ? params.projectId[0] : params.projectId}
                      onTimeEntryAdded={() => {
                        fetchTask();
                        window.dispatchEvent(new CustomEvent("timeEntryAdded"));
                      }}
                    />
                  )}
                  {canViewCosts && <TaskFinancePanel taskId={task.id} />}
                </TabsContent>
              )}

              <TabsContent value="files" className="mt-4">
                <Card className="rounded-xl border border-border bg-card shadow-none">
                  <CardHeader className="border-b border-border px-5 py-3.5">
                    <CardTitle className="m-0 text-sm font-semibold text-foreground">
                      Súbory a podklady
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <TaskFilesGrid taskId={task.id} />
                  </CardContent>
                </Card>
              </TabsContent>

              {canUpdateTasks && (
                <TabsContent value="settings" className="mt-4">
                  {task && (
                    <TaskSettingsPanel
                      taskId={task.id}
                      task={{
                        id: task.id,
                        title: task.title,
                        project_id: task.project_id || null,
                        color: task.color || null,
                        currency: task.currency || "EUR",
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
              )}
            </Tabs>
          )}
        </div>

        {/* ── Right sidebar: properties ─────────────────────────────────── */}
        <div className="w-full shrink-0 space-y-4 xl:w-[268px]">

          {/* Properties card */}
          <Card className="rounded-xl border border-border bg-card shadow-none">
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="m-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Detaily
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 px-0 py-0">

              {/* Status */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex w-24 shrink-0 items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Status</span>
                </div>
                <div className="min-w-0 flex-1">
                  <StatusSelect
                    status={task.status}
                    onStatusChange={handleStatusChange}
                    disabled={!canUpdateTasks}
                    size="dashboard"
                  />
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex w-24 shrink-0 items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Priorita</span>
                </div>
                <div className="min-w-0 flex-1">
                  <PrioritySelect
                    priority={task.priority}
                    onPriorityChange={handlePriorityChange}
                    disabled={!canUpdateTasks}
                    size="default"
                  />
                </div>
              </div>

              {/* Assignees */}
              <div className="flex items-start gap-3 px-4 py-2.5">
                <div className="flex w-24 shrink-0 items-center gap-1.5 pt-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Riešitelia</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {assignees.map((assignee, idx) => {
                      const name = (assignee as any).display_name || (assignee as any).user?.name || (assignee as any).email || "";
                      return (
                        <div
                          key={assignee.user_id || idx}
                          className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5"
                          title={name}
                        >
                          <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-muted-foreground/20 text-[9px] font-semibold text-muted-foreground">
                            {getInitials(name)}
                          </div>
                          <span className="max-w-[80px] truncate text-[11px] font-medium text-foreground">
                            {name.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                    {canUpdateTasks && (
                      <MultiAssigneeSelect
                        taskId={task.id}
                        currentAssignees={assignees}
                        onAssigneesChange={handleAssigneesChange}
                        disabled={!canUpdateTasks}
                        compact={true}
                      />
                    )}
                    {assignees.length === 0 && !canUpdateTasks && (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex w-24 shrink-0 items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Termín</span>
                </div>
                <div className="min-w-0 flex-1">
                  <DateRangePicker
                    startDate={task.start_date}
                    endDate={task.due_date}
                    onSave={handleDateRangeChange}
                    placeholder="Nastaviť dátum"
                    disabled={!canUpdateTasks}
                  />
                </div>
              </div>

              {/* Estimated hours */}
              {task.estimated_hours != null && task.estimated_hours > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex w-24 shrink-0 items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Odhad</span>
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {formatHours(task.estimated_hours)}
                  </span>
                </div>
              )}

              {/* Actual hours */}
              {task.actual_hours != null && task.actual_hours > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex w-24 shrink-0 items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Zaznam.</span>
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    task.estimated_hours && task.actual_hours > task.estimated_hours
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
                  )}>
                    {formatHours(task.actual_hours)}
                    {task.estimated_hours && task.actual_hours > 0 && (
                      <span className="ml-1 text-muted-foreground font-normal">
                        / {formatHours(task.estimated_hours)}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Budget */}
              {canViewCosts && task.budget_cents != null && task.budget_cents > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex w-24 shrink-0 items-center gap-1.5">
                    <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Budget</span>
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {formatCurrency(task.budget_cents / 100, task.currency || "EUR")}
                  </span>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Project status */}
          {task.project_id && canViewReports && (
            <ProjectStatusCard
              projectId={task.project_id}
              taskId={task.id}
              assignees={assignees}
            />
          )}

          {/* Quick links */}
          {task.id && (
            <ProjectQuickLinksSection taskId={task.id} />
          )}

        </div>
      </div>
    </div>
  );
}
