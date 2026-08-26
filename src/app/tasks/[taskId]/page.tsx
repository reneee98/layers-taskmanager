"use client";

import { useState, useEffect, useRef } from "react";
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
  Hash,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PageState } from "@/components/layout/page-state";
import { TimerNotePopover } from "@/components/timer/TimerNotePopover";

// Lazy load heavy components
const TimePanel = dynamic(
  () => import("@/components/time/TimePanel").then((mod) => ({ default: mod.TimePanel })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

const TaskTimeTab = dynamic(
  () => import("@/components/tasks/TaskTimeTab").then((mod) => ({ default: mod.TaskTimeTab })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

const TaskSettingsPanel = dynamic(
  () =>
    import("@/components/tasks/TaskSettingsPanel").then((mod) => ({
      default: mod.TaskSettingsPanel,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

const ProjectStatusCard = dynamic(
  () =>
    import("@/components/projects/ProjectStatusCard").then((mod) => ({
      default: mod.ProjectStatusCard,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

const CommentsList = dynamic(
  () => import("@/components/comments/CommentsList").then((mod) => ({ default: mod.CommentsList })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

const TaskDescription = dynamic(
  () =>
    import("@/components/tasks/TaskDescription").then((mod) => ({ default: mod.TaskDescription })),
  {
    loading: () => <div className="h-32 bg-muted animate-pulse rounded"></div>,
    ssr: false,
  }
);

// Status component for TaskDescription
const TaskDescriptionStatus = ({ taskId }: { taskId: string }) => {
  const [status, setStatus] = useState<"idle" | "typing" | "saving" | "saved" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleStatusChange = (
      newStatus: "idle" | "typing" | "saving" | "saved" | "error",
      text: string
    ) => {
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

    window.addEventListener(
      `task-description-status-${taskId}` as any,
      handleCustomStatusChange as EventListener
    );

    return () => {
      window.removeEventListener(
        `task-description-status-${taskId}` as any,
        handleCustomStatusChange as EventListener
      );
    };
  }, [taskId]);

  if (status === "idle") return null;

  const statusColor =
    status === "error"
      ? "text-red-500"
      : status === "saved"
        ? "text-green-500"
        : "text-muted-foreground";

  return (
    <div className={`text-xs ${statusColor} flex items-center gap-1`} title={error || undefined}>
      {statusText}
    </div>
  );
};

const MultiAssigneeSelect = dynamic(
  () =>
    import("@/components/tasks/MultiAssigneeSelect").then((mod) => ({
      default: mod.MultiAssigneeSelect,
    })),
  {
    loading: () => <div className="h-10 bg-muted animate-pulse rounded"></div>,
  }
);

const StatusSelect = dynamic(
  () => import("@/components/tasks/StatusSelect").then((mod) => ({ default: mod.StatusSelect })),
  {
    loading: () => <div className="h-10 bg-muted animate-pulse rounded"></div>,
  }
);

const PrioritySelect = dynamic(
  () =>
    import("@/components/tasks/PrioritySelect").then((mod) => ({ default: mod.PrioritySelect })),
  {
    loading: () => <div className="h-10 bg-muted animate-pulse rounded"></div>,
  }
);

const DateRangePicker = dynamic(
  () =>
    import("@/components/ui/date-range-picker").then((mod) => ({ default: mod.DateRangePicker })),
  {
    loading: () => <div className="h-10 bg-muted animate-pulse rounded"></div>,
    ssr: false,
  }
);

const GoogleDriveLinks = dynamic(
  () =>
    import("@/components/tasks/GoogleDriveLinks").then((mod) => ({
      default: mod.GoogleDriveLinks,
    })),
  {
    loading: () => <div className="h-20 bg-muted animate-pulse rounded"></div>,
  }
);

const ProjectQuickLinksSection = dynamic(
  () =>
    import("@/components/projects/ProjectQuickLinksSection").then((mod) => ({
      default: mod.ProjectQuickLinksSection,
    })),
  {
    loading: () => <div className="h-20 bg-muted animate-pulse rounded"></div>,
  }
);

const TaskFilesGrid = dynamic(
  () => import("@/components/tasks/TaskFilesGrid").then((mod) => ({ default: mod.TaskFilesGrid })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

const TaskChecklist = dynamic(
  () => import("@/components/tasks/TaskChecklist").then((mod) => ({ default: mod.TaskChecklist })),
  {
    loading: () => <div className="h-32 bg-muted animate-pulse rounded"></div>,
  }
);

const TaskFiles = dynamic(
  () => import("@/components/tasks/TaskFiles").then((mod) => ({ default: mod.TaskFiles })),
  {
    loading: () => <div className="h-32 bg-muted animate-pulse rounded"></div>,
  }
);

const FileUploadHandler = dynamic(
  () =>
    import("@/components/tasks/FileUploadHandler").then((mod) => ({
      default: mod.FileUploadHandler,
    })),
  {
    ssr: false,
  }
);

const TaskShareButton = dynamic(
  () =>
    import("@/components/tasks/TaskShareButton").then((mod) => ({ default: mod.TaskShareButton })),
  {
    ssr: false,
  }
);

import { toast } from "@/hooks/use-toast";
import { formatHours } from "@/lib/format";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { Task, TaskAssignee } from "@/types/database";
import { cn } from "@/lib/utils";
import { resolveTaskColor } from "@/lib/task-colors";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const { activeTimer, currentDuration, startTimer, stopTimer, refreshTimer } = useTimer();
  const { hasPermission: canReadTasks } = usePermission("tasks", "read");
  const { hasPermission: canViewHourlyRates } = usePermission("financial", "view_hourly_rates");
  const { hasPermission: canViewPrices } = usePermission("financial", "view_prices");
  const { hasPermission: canViewReports } = usePermission("financial", "view_reports");
  const { hasPermission: canReadTimeEntries } = usePermission("time_entries", "read");
  const { hasPermission: canReadComments } = usePermission("comments", "read");
  const { hasPermission: canCreateComments } = usePermission("comments", "create");
  const { hasPermission: canUpdateTasks } = usePermission("tasks", "update");
  const { hasPermission: canCreateTasks } = usePermission("tasks", "create");
  const { hasPermission: canDeleteTasks } = usePermission("tasks", "delete");
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
  const [isTimerNoteOpen, setIsTimerNoteOpen] = useState(false);
  const [isExtraMode, setIsExtraMode] = useState(false);
  const descriptionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
        // If task has a project, redirect to the project-based URL
        if (result.data.project_id) {
          router.replace(`/projects/${result.data.project_id}/tasks/${taskId}`);
          return;
        }
        setTask(result.data);
        setAssignees(result.data.assignees || []);
        setHasChanges(false);
      } else {
        console.error("Failed to fetch task:", result.error || "Unknown error");
        setTask(null);
        toast({
          title: "Chyba",
          description:
            result.error || "Úloha nebola nájdená alebo nemáte oprávnenie na jej zobrazenie",
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
    if (activeTimer && task && String(activeTimer.task_id) === String(task.id)) {
      // Timer is running for this task - sync description and extra mode
      if (activeTimer.description && timerDescription !== activeTimer.description) {
        setTimerDescription(activeTimer.description);
      }
      setIsExtraMode(activeTimer.is_extra === true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimer?.id, task?.id]);

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

    window.addEventListener("timeEntryAdded", handleTimeEntryAdded);
    return () => {
      window.removeEventListener("timeEntryAdded", handleTimeEntryAdded);
    };
  }, []);

  const handleDuplicate = async () => {
    if (!task) return;

    try {
      setIsSaving(true);

      // Prepare task data for duplication (exclude id, created_at, updated_at)
      const { id, created_at, updated_at, assignees, actual_hours, ...taskData } = task;

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

      // Navigate to new task - if it has project, go there, otherwise stay in /tasks
      if (task.project_id) {
        router.push(`/projects/${task.project_id}/tasks/${newTaskId}`);
      } else {
        router.push(`/tasks/${newTaskId}`);
      }
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

      // Navigate back to tasks list
      router.push(`/tasks`);
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

  const handleStatusChange = async (
    newStatus:
      | "todo"
      | "in_progress"
      | "review"
      | "sent_to_client"
      | "done"
      | "invoiced"
      | "cancelled"
  ) => {
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
        window.dispatchEvent(
          new CustomEvent("taskStatusChanged", {
            detail: { taskId: taskId, status: newStatus },
          })
        );
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

  const handleDateRangeChange = async (newStartDate: string | null, newDueDate: string | null) => {
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
        window.dispatchEvent(
          new CustomEvent("taskStatusChanged", {
            detail: { taskId: params.taskId },
          })
        );
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
        window.dispatchEvent(
          new CustomEvent("taskStatusChanged", {
            detail: { taskId: params.taskId, projectId: newProjectId },
          })
        );
        // Redirect to new project's task page or stay on current page if no project
        if (newProjectId) {
          router.push(`/projects/${newProjectId}/tasks/${params.taskId}`);
        }
        // If removing project, stay on /tasks/[taskId] page
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
    const isTimerRunningForThisTask =
      activeTimer && String(activeTimer.task_id) === String(task.id);

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
        setIsTimerNoteOpen(false);

        if (trackedHours > 0) {
          toast({
            title: wasExtra ? "Extra časovač zastavený" : "Časovač zastavený",
            description: `Zapísaných ${formatHours(trackedHours)} do ${wasExtra ? "extra času" : "úlohy"}.`,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
        fetchTask();

        // Dispatch event to refresh time entries in TaskTimeTab
        window.dispatchEvent(new CustomEvent("timerStopped"));
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
        task.project_id || "",
        task.project?.name || "Bez projektu",
        isExtraMode, // Pass extra mode
        timerDescription || undefined // Pass description
      );
      setIsTimerNoteOpen(true);
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
            description: newExtraMode
              ? "Čas sa zapíše ako extra (mimo scope)"
              : "Čas sa zapíše do úlohy",
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

    const isTimerRunning = activeTimer && task && String(activeTimer.task_id) === String(task.id);

    if (isTimerRunning) {
      // Debounce the API call
      if (descriptionUpdateTimeoutRef.current) {
        clearTimeout(descriptionUpdateTimeoutRef.current);
      }

      descriptionUpdateTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch("/api/timers/update", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: value }),
          });
        } catch (error) {
          console.error("Failed to update timer description:", error);
        }
      }, 500);
    }
  };

  const handleSaveTimerNote = async () => {
    if (descriptionUpdateTimeoutRef.current) {
      clearTimeout(descriptionUpdateTimeoutRef.current);
    }

    const normalizedDescription = timerDescription.trim();
    const response = await fetch("/api/timers/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: normalizedDescription }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      const errorMessage = result.error || "Poznámku sa nepodarilo uložiť";
      toast({ title: "Chyba", description: errorMessage, variant: "destructive" });
      throw new Error(errorMessage);
    }

    setTimerDescription(normalizedDescription);
    await refreshTimer();
    toast({ title: "Poznámka uložená" });
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
      case "invoiced":
        return "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800";
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
      case "invoiced":
        return FileText;
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
        description={
          !canReadTasks
            ? "O prístup požiadajte správcu workspace."
            : "Úloha mohla byť odstránená alebo presunutá."
        }
      />
    );
  }

  const deadlineStatus = getDeadlineStatus(task.due_date);
  const taskColor = resolveTaskColor(task);
  const deadlineBadge = getDeadlineBadge(deadlineStatus);
  const StatusIcon = getStatusIcon(task.status);
  const PriorityIcon = getPriorityIcon(task.priority);

  return (
    <div className="page-shell">
      <div className="sticky top-[60px] z-40 rounded-xl border border-border bg-card/90 px-3 py-3 backdrop-blur-md sm:px-4">
        <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Left side - Back button and breadcrumb */}
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            {/* Back Button */}
            <button
              onClick={() => router.push(`/tasks`)}
              className="h-8 rounded-lg flex items-center gap-2 px-2.5 hover:bg-muted dark:hover:bg-muted transition-colors"
              aria-label="Späť na úlohy"
              tabIndex={0}
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                Späť
              </span>
            </button>

            {/* Divider */}
            <div className="bg-secondary dark:bg-border h-4 w-px shrink-0" />

            {/* Breadcrumb - Simplified for tasks without project */}
            <div className="flex gap-2 items-center h-7">
              {/* Project selector - allows assigning project */}
              <Popover
                open={canUpdateTasks ? projectSelectOpen : false}
                onOpenChange={canUpdateTasks ? setProjectSelectOpen : undefined}
              >
                <PopoverTrigger asChild>
                  <button
                    disabled={!canUpdateTasks}
                    className={cn(
                      "flex gap-1.5 items-center px-2 h-7 rounded-lg transition-colors",
                      canUpdateTasks
                        ? "hover:bg-muted dark:hover:bg-muted cursor-pointer"
                        : "cursor-default"
                    )}
                  >
                    <Folder className="h-3 w-3 text-muted-foreground dark:text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                      Bez projektu
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
                              setProjectSelectOpen(false);
                            }}
                          >
                            <Check className="mr-2 h-4 w-4 opacity-100" />
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
                              <Check className="mr-2 h-4 w-4 opacity-0" />
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
                    {String(task.id).slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Timer, Share, Save */}
          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            {/* Timer Widget - Redesigned */}
            <div className="flex min-w-0 items-center gap-2">
              <TimerNotePopover
                key={task.id}
                taskId={task.id}
                taskTitle={task.title}
                value={timerDescription}
                isTimerActive={Boolean(
                  activeTimer && String(activeTimer.task_id) === String(task.id)
                )}
                disabled={isStartingTimer}
                open={isTimerNoteOpen}
                onOpenChange={setIsTimerNoteOpen}
                onValueChange={handleDescriptionChange}
                onStart={handleTimerToggle}
                onSave={handleSaveTimerNote}
              >
                <button
                  type="button"
                  disabled={isStartingTimer}
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-2 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-[180px] sm:justify-start sm:px-3",
                    timerDescription && "text-foreground"
                  )}
                  aria-label={
                    timerDescription
                      ? `Upraviť poznámku: ${timerDescription}`
                      : "Pridať poznámku k trackovaniu"
                  }
                  title={timerDescription || "Pridať poznámku k trackovaniu"}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 sm:mr-2" />
                  <span className="hidden min-w-0 truncate sm:block">
                    {timerDescription || "Čo práve robíš..."}
                  </span>
                  {timerDescription && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500 sm:hidden" />
                  )}
                </button>
              </TimerNotePopover>

              {/* Timer Controls */}
              <div className="flex h-8 items-center overflow-hidden rounded-lg border border-border bg-background">
                {/* Extra mode toggle (Zap) */}
                <button
                  onClick={handleToggleExtraMode}
                  className={`h-[30px] w-[35px] border-r border-border/60 dark:border-border flex items-center justify-center shrink-0 transition-colors hover:bg-muted dark:hover:bg-muted ${
                    isExtraMode ||
                    (activeTimer &&
                      String(activeTimer.task_id) === String(task?.id) &&
                      activeTimer.is_extra === true)
                      ? "bg-violet-50 dark:bg-violet-950/30 dark:bg-purple-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                      : ""
                  }`}
                  aria-label={
                    isExtraMode
                      ? "Extra mód zapnutý - čas sa zapíše do extra"
                      : "Normálny mód - čas sa zapíše do úlohy"
                  }
                  title={
                    isExtraMode ||
                    (activeTimer &&
                      String(activeTimer.task_id) === String(task?.id) &&
                      activeTimer.is_extra === true)
                      ? "Extra mód (čas mimo scope) - klikni pre prepnutie"
                      : "Normálny mód - klikni pre prepnutie na extra"
                  }
                  tabIndex={0}
                  type="button"
                >
                  <Zap
                    className={`h-3.5 w-3.5 ${
                      isExtraMode ||
                      (activeTimer &&
                        String(activeTimer.task_id) === String(task?.id) &&
                        activeTimer.is_extra === true)
                        ? "text-brand dark:text-purple-400"
                        : "text-muted-foreground dark:text-muted-foreground"
                    }`}
                  />
                </button>

                {/* Time display */}
                <div className="flex items-center px-3 min-w-[70px]">
                  <span
                    className={`text-xs font-bold leading-4 tabular-nums ${
                      activeTimer && String(activeTimer.task_id) === String(task?.id)
                        ? activeTimer.is_extra === true
                          ? "text-brand dark:text-purple-400"
                          : "text-foreground dark:text-foreground"
                        : "text-foreground dark:text-foreground"
                    }`}
                  >
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
                  aria-label={
                    activeTimer && String(activeTimer.task_id) === String(task?.id)
                      ? "Zastaviť časovač"
                      : "Spustiť časovač"
                  }
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
            <TaskShareButton
              taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
              compact
            />

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
                <span className="text-xs font-medium text-primary-foreground leading-4">
                  Uložiť zmeny
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-5">
        <section className="surface-panel overflow-hidden">
          {/* Title */}
          <div className="min-w-0 border-b border-border px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-3">
              {taskColor && (
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-full ring-2 ring-black/5 ring-offset-2 ring-offset-card"
                  style={{ backgroundColor: taskColor }}
                />
              )}
              <h1 className="min-w-0 text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
                {task.title}
              </h1>
              <Badge variant="outline">{normalizeCurrency(task.currency)}</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3 bg-muted/[0.16] p-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5 sm:px-5">
            {/* Assignees */}
            <div className="flex items-start pl-0 pr-[6px] py-0 relative shrink-0">
              {assignees.slice(0, 3).map((assignee, idx) => {
                const assigneeName =
                  (assignee as any).display_name ||
                  (assignee as any).user?.name ||
                  (assignee as any).email ||
                  "";
                return (
                  <div
                    key={assignee.user_id || idx}
                    className="bg-muted dark:bg-slate-700 border-2 border-solid border-white dark:border-slate-800 flex items-start mr-[-6px] overflow-clip p-[2px] relative rounded-full shadow-[0px_0px_0px_1px_#f1f5f9] dark:shadow-[0px_0px_0px_1px_#334155] shrink-0 size-[28px]"
                  >
                    <div className="bg-muted dark:bg-slate-600 h-[24px] w-[24px] rounded-full shrink-0 flex items-center justify-center">
                      <span className="font-normal leading-none text-muted-foreground dark:text-slate-300 text-[10px] tracking-wide">
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
            <div className="hidden h-4 w-px shrink-0 bg-border/60 sm:block" />

            {/* Date, Status, Priority badges */}
            <div className="relative flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Date badge */}
              <DateRangePicker
                startDate={task.start_date}
                endDate={task.due_date}
                onSave={handleDateRangeChange}
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
        </section>

        {/* Tabs Navigation */}
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border border-border bg-muted/[0.16] p-1 [&>*]:shrink-0">
              <TabsTrigger value="overview" className="relative">
                Práca
              </TabsTrigger>
              {canReadTimeEntries && (
                <TabsTrigger value="time" className="relative">
                  Čas
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
                  <span className="ml-1.5 bg-border/50 dark:bg-muted-foreground/30 text-muted-foreground dark:text-muted-foreground text-[9px] font-semibold leading-[12px] px-1 py-0 rounded-full h-[14px] flex items-center">
                    {filesCount}
                  </span>
                )}
              </TabsTrigger>
              {canUpdateTasks && <TabsTrigger value="settings">Nastavenia</TabsTrigger>}
            </TabsList>

            {/* Main Content - two column on large screens, single column on smaller */}
            <div className="mt-4 flex flex-col items-start gap-5 xl:flex-row">
              {/* Left Column - Main Content */}
              <div className="min-w-0 flex-1 space-y-6">
                <TabsContent value="overview" className="mt-0 space-y-5">
                  <Card className="rounded-xl border border-border bg-card shadow-none">
                    <CardHeader className="border-b border-border px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="m-0 text-sm font-semibold text-foreground">
                            Zadanie
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-3 text-[12px] font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground"
                          onClick={() => {
                            // Trigger edit mode for TaskDescription
                            const event = new CustomEvent("editTaskDescription");
                            window.dispatchEvent(event);
                          }}
                        >
                          Upraviť
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5">
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
                  <TaskChecklist
                    taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
                  />
                </TabsContent>

                {canReadTimeEntries && (
                  <TabsContent value="time" className="mt-0 space-y-5">
                    <TaskTimeTab
                      taskId={task.id}
                      onTimeEntryAdded={() => {
                        fetchTask();
                        window.dispatchEvent(new CustomEvent("timeEntryAdded"));
                      }}
                    />
                  </TabsContent>
                )}

                <TabsContent value="files" className="mt-0">
                  <Card className="rounded-xl border border-border bg-card shadow-none">
                    <CardHeader className="border-b border-border px-5 py-4">
                      <CardTitle className="m-0 text-sm font-semibold text-foreground">
                        Súbory a podklady
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                      <TaskFilesGrid taskId={task.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="mt-0">
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
              </div>

              {/* Right Sidebar - full width on small, fixed width on 2xl+ */}
              <div className="w-full shrink-0 space-y-5 xl:w-80">
                {/* Status projektu Card - only show if task has a project */}
                {task.project_id && canViewReports && (
                  <ProjectStatusCard
                    projectId={task.project_id}
                    taskId={task.id}
                    assignees={assignees}
                  />
                )}

                {/* Rýchle odkazy */}
                {task.id && <ProjectQuickLinksSection taskId={task.id} />}
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
