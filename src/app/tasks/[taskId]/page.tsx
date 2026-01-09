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
  ChevronRight,
  ChevronDown,
  Folder,
  Hash
} from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { toast } from "@/hooks/use-toast";
import { formatHours } from "@/lib/format";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn, getMarginColor } from "@/lib/utils";
import type { Task, TaskAssignee } from "@/types/database";
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

// Lazy load heavy components
const TimePanel = dynamic(() => import("@/components/time/TimePanel").then(mod => ({ default: mod.TimePanel })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const CostsPanel = dynamic(() => import("@/components/costs/CostsPanel").then(mod => ({ default: mod.CostsPanel })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
});

const ProjectReport = dynamic(() => import("@/components/report/ProjectReport").then(mod => ({ default: mod.ProjectReport })), {
  ssr: false,
});

const TaskReport = dynamic(() => import("@/components/report/TaskReport").then(mod => ({ default: mod.TaskReport })), {
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

const ProjectQuickLinksSection = dynamic(() => import("@/components/projects/ProjectQuickLinksSection").then(mod => ({ default: mod.ProjectQuickLinksSection })), {
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

const TaskShareButton = dynamic(() => import("@/components/tasks/TaskShareButton").then(mod => ({ default: mod.TaskShareButton })), {
  ssr: false,
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
    <div className={cn("flex items-center gap-1 text-[10px] leading-tight", statusColor)}>
      {status === "saving" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {status === "saved" && <CheckCircle className="h-2.5 w-2.5" />}
      {status === "error" && <AlertCircle className="h-2.5 w-2.5" />}
      <span className="text-[10px]">{statusText}</span>
    </div>
  );
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const { activeTimer, startTimer, stopTimer, refreshTimer, currentDuration } = useTimer();
  const canReadTasksResult = usePermission('tasks', 'read');
  const canViewHourlyRatesResult = usePermission('financial', 'view_hourly_rates');
  const canViewPricesResult = usePermission('financial', 'view_prices');
  const canViewCostsResult = usePermission('financial', 'view_costs');
  const canViewReportsResult = usePermission('financial', 'view_reports');
  const canReadTimeEntriesResult = usePermission('time_entries', 'read');
  const canReadCommentsResult = usePermission('comments', 'read');
  const canCreateCommentsResult = usePermission('comments', 'create');
  const canUpdateTasksResult = usePermission('tasks', 'update');
  const canCreateTasksResult = usePermission('tasks', 'create');
  const canDeleteTasksResult = usePermission('tasks', 'delete');
  
  const canReadTasks = canReadTasksResult.hasPermission;
  const canViewHourlyRates = canViewHourlyRatesResult.hasPermission;
  const canViewPrices = canViewPricesResult.hasPermission;
  const canViewCosts = canViewCostsResult.hasPermission;
  const canViewReports = canViewReportsResult.hasPermission;
  const canReadTimeEntries = canReadTimeEntriesResult.hasPermission;
  const canReadComments = canReadCommentsResult.hasPermission;
  const canCreateComments = canCreateCommentsResult.hasPermission;
  const canUpdateTasks = canUpdateTasksResult.hasPermission;
  const canCreateTasks = canCreateTasksResult.hasPermission;
  const canDeleteTasks = canDeleteTasksResult.hasPermission;
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
  const [filesCount, setFilesCount] = useState(0);
  const [driveLinks, setDriveLinks] = useState<Array<{ id: string; url: string; description: string | null }>>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [userSettings, setUserSettings] = useState<{ default_hourly_rate?: number | null } | null>(null);
  const [isStartingTimer, setIsStartingTimer] = useState(false);
  const prevActiveTimerRef = useRef<typeof activeTimer>(null);
  const [projectSelectOpen, setProjectSelectOpen] = useState(false);

  const fetchTask = async () => {
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
        setDriveLinks(result.data || []);
      } else {
        setLinksCount(0);
        setDriveLinks([]);
      }
    } catch (error) {
      setLinksCount(0);
      setDriveLinks([]);
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

  // Fetch user settings for default hourly rate
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const response = await fetch("/api/me/settings");
        const result = await response.json();
        if (result.success) {
          setUserSettings(result.data);
        }
      } catch (error) {
        console.error("Error fetching user settings:", error);
      }
    };
    fetchUserSettings();
  }, []);

  // Auto-calculate estimated_hours from budget_cents when budget changes
  useEffect(() => {
    if (!task || !task.budget_cents || task.budget_cents <= 0) {
      return;
    }

    // Get hourly rate - priority: task.hourly_rate_cents > project.hourly_rate > user_settings.default_hourly_rate
    let hourlyRate: number | null = null;
    
    if (task.hourly_rate_cents && task.hourly_rate_cents > 0) {
      hourlyRate = task.hourly_rate_cents / 100;
    } else if (task.project?.hourly_rate) {
      hourlyRate = task.project.hourly_rate;
    } else if (userSettings?.default_hourly_rate != null) {
      hourlyRate = userSettings.default_hourly_rate;
    }

    // Only auto-calculate if hourly rate is available and estimated_hours is not manually set
    if (hourlyRate && hourlyRate > 0 && (!task.estimated_hours || task.estimated_hours === 0)) {
      const budgetInEuros = task.budget_cents / 100;
      const calculatedHours = Math.round((budgetInEuros / hourlyRate) * 100) / 100;
      
      // Only update if calculated value is different from current
      if (calculatedHours !== task.estimated_hours) {
        setTask(prev => prev ? { ...prev, estimated_hours: calculatedHours } : null);
        setHasChanges(true);
      }
    }
  }, [task?.budget_cents, task?.hourly_rate_cents, task?.project?.hourly_rate, userSettings?.default_hourly_rate]);

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

  useEffect(() => {
    if (task) {
      setDescription(task.description || "");
      setDescriptionHtml(task.description || "");
    }
  }, [task]);

  const handleDescriptionChange = (content: string, html: string) => {
    setDescription(content);
    setDescriptionHtml(html);
    setHasChanges(true);
    // Don't auto-save - wait for user to click "Uložiť" button
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
        if (validProjectId && validProjectId !== 'unknown') {
          router.push(`/projects/${validProjectId}/tasks/${newTaskId}`);
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

      // Navigate back to tasks page or project if task has project
      if (task.project_id) {
        router.push(`/projects/${task.project_id}`);
      } else {
        router.push(`/tasks`);
      }
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
      // Save task settings (including task budget, hourly rate, and description)
      const taskPayload: any = {
        estimated_hours: task.estimated_hours,
        description: descriptionHtml.trim() || null,
      };
      
      // Include task budget if it exists
      if (task.budget_cents !== undefined) {
        taskPayload.budget_cents = task.budget_cents;
      }
      
      // Include hourly_rate_cents if task has no project
      if (!task.project_id && task.hourly_rate_cents !== undefined) {
        taskPayload.hourly_rate_cents = task.hourly_rate_cents;
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
          detail: { taskId: taskId } 
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
          detail: { taskId: taskId, projectId: newProjectId } 
        }));
        // Redirect to new project's task page or stay on current page if no project
        if (newProjectId) {
          router.push(`/projects/${newProjectId}/tasks/${taskId}`);
        } else {
          // If task has no project, stay on tasks page
          router.push(`/tasks/${taskId}`);
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
          detail: { taskId: taskId } 
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
    if (activeTimer && activeTimer.task_id === task.id && !activeTimer.is_extra) {
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
    if (activeTimer && !activeTimer.is_extra) {
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
        task.project?.name || "Neznámy projekt",
        false // Regular time, not extra
      );
      // Refresh timer state after starting
      await refreshTimer();
      toast({
        title: "Časovač spustený",
        description: `Začal som trackovať čas pre úlohu "${task.title}"`,
      });
    } catch (error) {
      console.error("Error in handleTimerToggle:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa spustiť časovač",
        variant: "destructive",
      });
    } finally {
      setIsStartingTimer(false);
    }
  };

  const handleExtraTimerToggle = async () => {
    if (!task) return;

    // If extra time is currently being tracked for this task, stop it
    if (activeTimer && activeTimer.task_id === task.id && activeTimer.is_extra) {
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

    // If another timer is active, stop it first
    if (activeTimer) {
      try {
        const startedAt = new Date(activeTimer.started_at);
        const now = new Date();
        const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const trackedHours = Number((duration / 3600).toFixed(3));
        await stopTimer();

        if (trackedHours > 0) {
          const timerType = activeTimer.is_extra ? "extra časovač" : "časovač";
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
        task.project_id,
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

  // Helper functions for Figma design
  const formatTimerDisplay = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateRange = () => {
    if (task.start_date && task.due_date) {
      const start = new Date(task.start_date);
      const end = new Date(task.due_date);
      return `${format(start, "d. M.", { locale: sk })} - ${format(end, "d. M.", { locale: sk })}`;
    }
    if (task.start_date) {
      return `${format(new Date(task.start_date), "d. M.", { locale: sk })}`;
    }
    if (task.due_date) {
      return `${format(new Date(task.due_date), "d. M.", { locale: sk })}`;
    }
    return "Nastaviť dátum";
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "review":
        return "bg-[#fffbeb] border-[#fee685] text-[#bb4d00]";
      case "urgent":
        return "bg-[#fef2f2] border-[#ffc9c9] text-[#c10007]";
      default:
        return "bg-muted border-border text-muted-foreground";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-[#fef2f2] border-[#ffc9c9] text-[#c10007]";
      default:
        return "bg-muted border-border text-muted-foreground";
    }
  };

  // Show timer only if it's regular time (not extra) for this task
  const timerSeconds = activeTimer && activeTimer.task_id === task.id && !activeTimer.is_extra ? currentDuration : 0;
  // Show extra timer separately
  const extraTimerSeconds = activeTimer && activeTimer.task_id === task.id && activeTimer.is_extra ? currentDuration : 0;

  return (
    <div className="relative min-h-screen -mx-3 sm:-mx-4 md:-mx-6">
      {/* Fixed Header - Figma 1:1 */}
      <div className="sticky top-0 z-50 bg-[rgba(255,255,255,0.8)] dark:bg-[rgba(24,24,27,0.8)] border-b border-[rgba(226,232,240,0.8)] dark:border-border backdrop-blur-sm pt-4 px-6 pb-4">
        <div className="flex h-8 items-center justify-between w-full">
          {/* Left side - Back button and breadcrumb */}
          <div className="flex gap-4 items-center h-8">
            {/* Back Button */}
            <button
              onClick={() => {
                if (task?.project_id) {
                  router.push(`/projects/${task.project_id}`);
                } else {
                  router.push(`/tasks`);
                }
              }}
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
                  <div className="flex gap-1.5 items-center px-2 h-7 rounded-lg hover:bg-[#f1f5f9] dark:hover:bg-muted transition-colors">
                    <Folder className="h-3 w-3 text-[#45556c] dark:text-foreground shrink-0" />
                    <span className="text-sm font-medium text-[#45556c] dark:text-foreground tracking-[-0.15px]">
                      {task.project.name}
                    </span>
                  </div>

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
              {/* Extra timer icon section */}
              <button
                onClick={handleExtraTimerToggle}
                disabled={isStartingTimer}
                className={`h-[30px] w-[35px] border-r border-[#f1f5f9] dark:border-border flex items-center justify-center shrink-0 hover:bg-[#f1f5f9] dark:hover:bg-muted transition-colors disabled:opacity-50 ${
                  activeTimer && activeTimer.task_id === task.id && activeTimer.is_extra
                    ? "bg-[#fef3c7] dark:bg-yellow-900/20 border-r-yellow-300 dark:border-r-yellow-800"
                    : ""
                }`}
                aria-label={activeTimer && activeTimer.task_id === task.id && activeTimer.is_extra ? "Zastaviť extra časovač" : "Spustiť extra časovač"}
                tabIndex={0}
              >
                <Zap className={`h-3.5 w-3.5 ${
                  activeTimer && activeTimer.task_id === task.id && activeTimer.is_extra
                    ? "text-yellow-600 dark:text-yellow-500"
                    : "text-[#62748e] dark:text-muted-foreground"
                }`} />
              </button>
              {/* Timer icon section */}
              <div className="h-[30px] w-[35px] border-r border-[#f1f5f9] dark:border-border flex items-center justify-center shrink-0">
                <Timer className="h-3.5 w-3.5 text-[#62748e] dark:text-muted-foreground" />
              </div>

              {/* Time display */}
              <div className="flex-1 flex items-center px-3">
                <span className="text-xs font-bold text-[#314158] dark:text-foreground leading-4 tabular-nums">
                  {formatTimerDisplay(timerSeconds)}
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
            <TaskShareButton taskId={taskId} compact />

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

      {/* Main Content with gradient background */}
      <div 
        className="min-h-[calc(100vh-60px)] sm:min-h-[calc(100vh-73px)] pt-3 sm:pt-4 md:pt-6 lg:pt-8 pb-6 sm:pb-8 md:pb-10 lg:pb-14 px-3 sm:px-4 md:px-6 lg:px-10 mx-0"
        style={{
          backgroundImage: "linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.5) 100%), linear-gradient(90deg, rgba(248, 250, 252, 0.3) 0%, rgba(248, 250, 252, 0.3) 100%)"
        }}
      >

        {/* Task Title and Meta - according to Figma */}
        <div className="content-stretch flex flex-col gap-3 sm:gap-4 md:gap-5 lg:gap-[20px] items-start relative shrink-0 w-full">
          {/* Title */}
          <div className="relative shrink-0 w-full">
            <h1 className="font-bold text-lg sm:text-xl md:text-2xl lg:text-[30px] leading-tight sm:leading-[26px] md:leading-[30px] lg:leading-[37.5px] text-[#0f172b] dark:text-foreground tracking-[-0.3545px]">
              {task.title}
            </h1>
          </div>

          {/* Assignees, Date, Status badges */}
          <div className="content-stretch flex flex-wrap gap-2 sm:gap-3 md:gap-4 lg:gap-[20px] items-center relative shrink-0 w-full">
            {/* Assignees avatars */}
            <div className="content-stretch flex items-start pl-0 pr-1 sm:pr-[6px] py-0 relative shrink-0">
              {assignees.slice(0, 3).map((assignee, idx) => {
                const assigneeName = (assignee as any).display_name || (assignee as any).user?.name || (assignee as any).email || "";
                return (
                  <div
                    key={assignee.user_id || idx}
                    className="bg-[#f1f5f9] dark:bg-slate-700 border-2 border-solid border-white dark:border-slate-800 flex items-start mr-[-4px] sm:mr-[-6px] overflow-clip p-[1px] sm:p-[2px] relative rounded-full shadow-[0px_0px_0px_1px_#f1f5f9] dark:shadow-[0px_0px_0px_1px_#334155] shrink-0 size-6 sm:size-7 md:size-[28px]"
                  >
                    <div className="bg-[#ececf0] dark:bg-slate-600 h-5 w-5 sm:h-6 sm:w-6 md:h-[24px] md:w-[24px] rounded-full shrink-0 flex items-center justify-center">
                      <span className="font-normal leading-[14.286px] text-[#45556c] dark:text-slate-300 text-[8px] sm:text-[9px] md:text-[10px] tracking-[0.1172px]">
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
            <div className="bg-[rgba(202,213,226,0.5)] dark:bg-border h-[16px] shrink-0 w-px hidden sm:block" />
            {/* Date badge and Status/Priority badges */}
            <div className="content-stretch flex flex-wrap gap-1.5 sm:gap-2 md:gap-3 lg:gap-[12px] items-center relative shrink-0">
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
              {canUpdateTasks ? (
                <StatusSelect
                  status={task.status}
                  onStatusChange={handleStatusChange}
                  disabled={!canUpdateTasks}
                  size="default"
                />
              ) : (
                <div className={cn(
                  "border border-solid rounded-full h-[28px] sm:h-[32px] md:h-[36px] px-2 sm:px-2.5 md:px-3 lg:px-[13px] py-px flex items-center justify-between gap-1 sm:gap-1.5 md:gap-2 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0",
                  task.status === "review"
                    ? "bg-[#fffbeb] border-[#fee685] text-[#bb4d00]"
                    : task.status === "todo"
                    ? "bg-muted border-border text-muted-foreground"
                    : task.status === "in_progress"
                    ? "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                    : task.status === "sent_to_client"
                    ? "bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300"
                    : task.status === "done"
                    ? "bg-green-100 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
                    : task.status === "cancelled"
                    ? "bg-red-100 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
                    : "bg-muted border-border text-muted-foreground"
                )}>
                  <span className="font-medium leading-tight sm:leading-[14px] md:leading-[16px] text-[9px] sm:text-[10px] md:text-[11px] lg:text-[12px] text-center">
                    {task.status === "review" ? "Review" : task.status === "todo" ? "Na spracovanie" : task.status === "in_progress" ? "V práci" : task.status === "sent_to_client" ? "Odoslané klientovi" : task.status === "done" ? "Hotovo" : task.status === "cancelled" ? "Zrušené" : task.status}
                  </span>
                  <ChevronDown className="relative shrink-0 size-3 sm:size-3.5 md:size-4 lg:size-[16px]" />
                </div>
              )}
              {/* Priority badge */}
              {canUpdateTasks ? (
                <PrioritySelect
                  priority={task.priority}
                  onPriorityChange={handlePriorityChange}
                  disabled={!canUpdateTasks}
                  size="default"
                />
              ) : (
                <div className={cn(
                  "border border-solid rounded-full h-[28px] sm:h-[32px] md:h-[36px] px-2 sm:px-2.5 md:px-3 lg:px-[13px] py-px flex items-center justify-between gap-1 sm:gap-1.5 md:gap-2 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0",
                  task.priority === "urgent"
                    ? "bg-[#fef2f2] border-[#ffc9c9] text-[#c10007]"
                    : task.priority === "high"
                    ? "bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300"
                    : task.priority === "medium"
                    ? "bg-yellow-100 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300"
                    : task.priority === "low"
                    ? "bg-green-100 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
                    : "bg-muted border-border text-muted-foreground"
                )}>
                  <span className="font-medium leading-tight sm:leading-[14px] md:leading-[16px] text-[9px] sm:text-[10px] md:text-[11px] lg:text-[12px] text-center">
                    {task.priority === "urgent" ? "Urgent" : task.priority === "high" ? "Vysoká" : task.priority === "medium" ? "Medium" : task.priority === "low" ? "Nízka" : task.priority}
                  </span>
                  <ChevronDown className="relative shrink-0 size-3 sm:size-3.5 md:size-4 lg:size-[16px]" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area - Tabs and Sidebar */}
        <div className="flex flex-col gap-4 sm:gap-5 md:gap-6">
          {/* Tabs */}
          <div className="flex-1 w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0 scrollbar-hide mt-3">
              <TabsList className="inline-flex h-[34px] sm:h-[38px] items-center justify-center rounded-[10px] bg-[rgba(241,245,249,0.8)] dark:bg-muted p-[3px] sm:p-[5px] border border-[rgba(226,232,240,0.5)] dark:border-border min-w-max">
              <TabsTrigger 
                value="overview" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-2.5 sm:px-3 md:px-4 py-[4px] sm:py-[5px] md:py-[6px] h-[26px] sm:h-[28px] text-[10px] sm:text-[11px] md:text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-[#0f172b] data-[state=active]:shadow-[0px_0px_0px_1px_#e2e8f0,0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] data-[state=inactive]:text-[#62748e] dark:data-[state=inactive]:text-muted-foreground"
              >
                Prehľad
              </TabsTrigger>
              <TabsTrigger 
                value="files" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-2.5 sm:px-3 md:px-4 py-[4px] sm:py-[5px] md:py-[6px] h-[26px] sm:h-[28px] text-[10px] sm:text-[11px] md:text-xs font-semibold transition-all relative data-[state=active]:bg-white data-[state=active]:text-[#0f172b] data-[state=active]:shadow-[0px_0px_0px_1px_#e2e8f0,0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] data-[state=inactive]:text-[#62748e] dark:data-[state=inactive]:text-muted-foreground"
                onClick={() => setActiveTab("files")}
              >
                Súbory
                {filesCount > 0 && (
                <span className="ml-1 sm:ml-1.5 bg-[rgba(226,232,240,0.5)] dark:bg-muted-foreground/30 text-[#62748e] dark:text-muted-foreground text-[8px] sm:text-[9px] font-semibold leading-[12px] px-1 py-0 rounded-full h-[12px] sm:h-[14px] flex items-center">
                  {filesCount}
                </span>
                )}
              </TabsTrigger>
              {canReadTimeEntries && (
                <TabsTrigger 
                  value="time" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-2.5 sm:px-3 md:px-4 py-[4px] sm:py-[5px] md:py-[6px] h-[26px] sm:h-[28px] text-[10px] sm:text-[11px] md:text-xs font-semibold transition-all relative data-[state=active]:bg-white data-[state=active]:text-[#0f172b] data-[state=active]:shadow-[0px_0px_0px_1px_#e2e8f0,0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] data-[state=inactive]:text-[#62748e] dark:data-[state=inactive]:text-muted-foreground"
                >
                  Čas
                  {task?.actual_hours && task.actual_hours > 0 && (
                    <span className="ml-1 sm:ml-1.5 bg-[rgba(226,232,240,0.5)] dark:bg-muted-foreground/30 text-[#62748e] dark:text-muted-foreground text-[8px] sm:text-[9px] font-semibold leading-[12px] px-1 py-0 rounded-full h-[12px] sm:h-[14px] flex items-center">
                      {formatHours(task.actual_hours)}
                    </span>
                  )}
                </TabsTrigger>
              )}
              {canViewCosts && (
                <TabsTrigger 
                  value="costs" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-2.5 sm:px-3 md:px-4 py-[4px] sm:py-[5px] md:py-[6px] h-[26px] sm:h-[28px] text-[10px] sm:text-[11px] md:text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-[#0f172b] data-[state=active]:shadow-[0px_0px_0px_1px_#e2e8f0,0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] data-[state=inactive]:text-[#62748e] dark:data-[state=inactive]:text-muted-foreground"
                >
                  Financie
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="history" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-2.5 sm:px-3 md:px-4 py-[4px] sm:py-[5px] md:py-[6px] h-[26px] sm:h-[28px] text-[10px] sm:text-[11px] md:text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-[#0f172b] data-[state=active]:shadow-[0px_0px_0px_1px_#e2e8f0,0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] data-[state=inactive]:text-[#62748e] dark:data-[state=inactive]:text-muted-foreground"
                onClick={() => setActiveTab("history")}
              >
                História
              </TabsTrigger>
              {canUpdateTasks && (
                <TabsTrigger 
                  value="settings" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-2.5 sm:px-3 md:px-4 py-[4px] sm:py-[5px] md:py-[6px] h-[26px] sm:h-[28px] text-[10px] sm:text-[11px] md:text-xs font-semibold transition-all flex-1 min-w-0 data-[state=active]:bg-white data-[state=active]:text-[#0f172b] data-[state=active]:shadow-[0px_0px_0px_1px_#e2e8f0,0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] data-[state=inactive]:text-[#62748e] dark:data-[state=inactive]:text-muted-foreground"
                >
                  Nastavenia
                </TabsTrigger>
              )}
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-3 sm:mt-4 md:mt-6">
              {/* Single column layout - cards full width */}
              <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
                {/* Main Content - full width */}
                <div className="w-full space-y-3 sm:space-y-4 md:space-y-6">
                  {/* Zadanie & Špecifikácia */}
                  <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-sm">
                    <CardHeader className="min-h-[60px] sm:min-h-[71px] border-b border-[#f1f5f9] dark:border-border pb-0 pt-2.5 sm:pt-3 md:pt-4 px-3 sm:px-4 md:px-6">
                      <div className="flex items-center justify-between min-h-6 flex-wrap gap-1.5 sm:gap-2">
                        <CardTitle className="text-[11px] sm:text-xs md:text-sm font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px] flex items-center gap-1.5 sm:gap-2 md:gap-3">
                          <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                          Zadanie & Špecifikácia
                        </CardTitle>
                        {canUpdateTasks && (
                          <Button variant="ghost" size="sm" className="h-5 sm:h-6 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs font-medium text-[#90a1b9] dark:text-muted-foreground hover:text-foreground">
                            Upraviť
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
                      <FileUploadHandler
                        taskId={taskId}
                        onFileUploaded={(fileUrl, htmlContent) => {
                          fetchFilesCount();
                        }}
                      >
                        <TaskDescription
                          taskId={taskId}
                          initialDescription={task?.description || ""}
                        />
                      </FileUploadHandler>
                    </CardContent>
                  </Card>

                  {/* Checklist */}
                  <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-sm">
                    <CardHeader className="min-h-[60px] sm:min-h-[69px] border-b border-[#f1f5f9] dark:border-border pb-0 pt-2.5 sm:pt-3 md:pt-4 px-3 sm:px-4 md:px-6 rounded-tl-[14px] rounded-tr-[14px]">
                      <div className="flex items-center justify-between min-h-[20px] sm:min-h-[22px] flex-wrap gap-1.5 sm:gap-2">
                        <CardTitle className="text-[11px] sm:text-xs md:text-sm font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px] flex items-center gap-1.5 sm:gap-2 md:gap-3">
                          <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                          Checklist
                        </CardTitle>
                        {/* TODO: Calculate percentage */}
                        <Badge variant="secondary" className="bg-[#f1f5f9] dark:bg-muted border border-[#e2e8f0] dark:border-border h-[18px] sm:h-[20px] md:h-[22px] px-1.5 sm:px-2 md:px-2.5 py-0.5 text-[9px] sm:text-[10px] md:text-xs font-medium text-[#45556c] dark:text-foreground rounded-lg">
                          67% hotovo
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
                      <TaskChecklist taskId={taskId} />
                    </CardContent>
                  </Card>
                </div>

                {/* Status and Quick Links - full width on all screens */}
                <div className="w-full space-y-3 sm:space-y-4 md:space-y-6">
                  {/* Status projektu */}
                  <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border border-t-4 rounded-[14px] shadow-sm">
                    <CardHeader className="min-h-[60px] sm:min-h-[66px] border-b border-[#f1f5f9] dark:border-border pb-0 pt-2.5 sm:pt-3 md:pt-4 px-3 sm:px-4 md:px-5">
                      <div className="flex items-center justify-between min-h-5 flex-wrap gap-1.5 sm:gap-2">
                        <CardTitle className="text-[11px] sm:text-xs md:text-sm font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px] flex items-center gap-1.5 sm:gap-2 md:gap-3">
                          <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                          Status projektu
                        </CardTitle>
                        {/* TODO: Project status badge */}
                        <Badge className="bg-[#fef2f2] dark:bg-red-900/20 border border-[#ffe2e2] dark:border-red-800 h-[18px] sm:h-[20px] md:h-[21px] px-1.5 sm:px-2 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-bold text-[#e7000b] dark:text-red-400 tracking-[0.6172px] uppercase flex items-center gap-1 sm:gap-1.5">
                          <div className="bg-[#fb2c36] dark:bg-red-500 w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full" />
                          At Risk
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 sm:pt-4 md:pt-5 px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 md:pb-5">
                      {/* Budget progress */}
                      <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 md:mb-5">
                        <div className="flex items-end justify-between min-h-5 flex-wrap gap-1.5 sm:gap-2">
                          <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-[#62748e] dark:text-muted-foreground tracking-[0.3px] uppercase">
                            Čerpanie Budgetu
                          </span>
                          <div className="flex items-baseline gap-0.5 sm:gap-1">
                            <span className="text-[10px] sm:text-xs md:text-sm font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px]">
                              {task.budget_cents ? `${(task.budget_cents / 100).toFixed(0)}€` : '0€'}
                            </span>
                            <span className="text-[9px] sm:text-[10px] md:text-xs text-[#90a1b9] dark:text-muted-foreground">
                              / {task.project?.budget ? `${task.project.budget.toFixed(0)}€` : '0€'}
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="bg-[#f1f5f9] dark:bg-muted h-2 sm:h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#ff8904] dark:bg-orange-500 h-full rounded-full transition-all"
                            style={{ 
                              width: task.project?.budget && task.project.budget > 0 
                                ? `${Math.min(100, ((task.budget_cents || 0) / 100 / task.project.budget) * 100)}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                      </div>
                      <div className="border-t border-[#f1f5f9] dark:border-border pt-3 sm:pt-4 md:pt-5">
                        {/* Zisk and Marža */}
                        <div className="grid grid-cols-2 gap-0 border-b border-[#f1f5f9] dark:border-border pb-3 sm:pb-4 md:pb-5">
                          <div className="pr-2 sm:pr-3 md:pr-5 border-r border-[#f1f5f9] dark:border-border">
                            <div className="mb-1 sm:mb-1.5 md:mb-2">
                              <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-[#90a1b9] dark:text-muted-foreground tracking-[0.6172px] uppercase">
                                Zisk
                              </span>
                            </div>
                            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#0f172b] dark:text-foreground tracking-[-0.5297px] leading-tight sm:leading-6 md:leading-7 lg:leading-8">
                              {task.project && task.project.budget && task.budget_cents
                                ? `${(task.project.budget - (task.budget_cents / 100)).toFixed(0)}€`
                                : '0€'}
                            </div>
                          </div>
                          <div className="pl-2 sm:pl-3 md:pl-5">
                            <div className="mb-1 sm:mb-1.5 md:mb-2">
                              <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-[#90a1b9] dark:text-muted-foreground tracking-[0.6172px] uppercase">
                                Marža
                              </span>
                            </div>
                            <div className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-[-0.5297px] leading-tight sm:leading-6 md:leading-7 lg:leading-8 ${
                              getMarginColor(
                                task.project && task.project.budget && task.budget_cents && task.project.budget > 0
                                  ? (((task.project.budget - (task.budget_cents / 100)) / task.project.budget) * 100)
                                  : 0
                              )
                            }`}>
                              {task.project && task.project.budget && task.budget_cents && task.project.budget > 0
                                ? `${(((task.project.budget - (task.budget_cents / 100)) / task.project.budget) * 100).toFixed(1)}%`
                                : '0%'}
                            </div>
                          </div>
                        </div>
                        {/* Čas and Extra */}
                        <div className="grid grid-cols-2 gap-0 pt-3 sm:pt-4 md:pt-5">
                          <div className="pr-2 sm:pr-3 md:pr-5 border-r border-[#f1f5f9] dark:border-border">
                            <div className="mb-1 sm:mb-1.5 md:mb-2">
                              <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-[#90a1b9] dark:text-muted-foreground tracking-[0.6172px] uppercase">
                                Čas
                              </span>
                            </div>
                            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#0f172b] dark:text-foreground tracking-[-0.4492px] leading-tight sm:leading-6 md:leading-7">
                              {task.actual_hours ? `${task.actual_hours}h` : '0h'}
                            </div>
                          </div>
                          <div className="pl-2 sm:pl-3 md:pl-5">
                            <div className="mb-1 sm:mb-1.5 md:mb-2">
                              <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-[#90a1b9] dark:text-muted-foreground tracking-[0.6172px] uppercase">
                                Extra
                              </span>
                            </div>
                            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#7f22fe] dark:text-purple-500 tracking-[-0.4492px] leading-tight sm:leading-6 md:leading-7">
                              +0€
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Náklady tímu */}
                      <div className="bg-[rgba(248,250,252,0.3)] dark:bg-muted/30 mt-3 sm:mt-4 md:mt-5 pt-3 sm:pt-4 md:pt-5 px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 md:pb-5 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2 md:mb-3">
                          <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-[#314158] dark:text-foreground">
                            Náklady tímu
                          </span>
                          <span className="text-[10px] sm:text-xs font-bold text-[#0f172b] dark:text-foreground">
                            {(() => {
                              // Calculate team costs: actual_hours * hourly_rate
                              // Use task hourly_rate_cents if available, otherwise project hourly_rate
                              const hourlyRate = task.hourly_rate_cents 
                                ? task.hourly_rate_cents / 100 
                                : task.project?.hourly_rate || 0;
                              const teamCosts = task.actual_hours && hourlyRate 
                                ? (task.actual_hours * hourlyRate).toFixed(0)
                                : '0';
                              return `${teamCosts}€`;
                            })()}
                          </span>
                        </div>
                        {/* Team avatars */}
                        <div className="flex items-center -space-x-3">
                          {assignees.slice(0, 3).map((assignee, idx) => {
                            const assigneeName = (assignee as any).display_name || (assignee as any).user?.name || (assignee as any).email || "";
                            return (
                              <div
                                key={assignee.user_id || idx}
                                className="bg-[#f1f5f9] dark:bg-slate-700 border-2 border-white dark:border-slate-800 rounded-full h-7 w-7 flex items-center justify-center shadow-[0px_0px_0px_1px_#f1f5f9] dark:shadow-[0px_0px_0px_1px_#334155]"
                              >
                                <span className="text-[10px] font-normal text-[#45556c] dark:text-slate-300 tracking-[0.1172px]">
                                  {getInitials(assigneeName)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rýchle odkazy */}
                  <ProjectQuickLinksSection taskId={taskId} />
                </div>
              </div>
            </TabsContent>

            {/* Files tab */}
            <TabsContent value="files" className="mt-4 sm:mt-6">
              <TaskFiles taskId={taskId} />
            </TabsContent>

            {/* History tab */}
            <TabsContent value="history" className="mt-4 sm:mt-6">
              <Card className="bg-card border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    História zmien
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">História zmien bude doplnená.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {canReadTimeEntries && (
              <TabsContent value="time" className="mt-4 sm:mt-6">
                <Card className="bg-card border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Časové záznamy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <TimePanel 
                      projectId={task?.project_id} 
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
              <TabsContent value="costs" className="mt-4 sm:mt-6">
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
                        projectId={task.project_id} 
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
              <TabsContent value="settings" className="space-y-4 mt-4 sm:mt-6">
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

                    {/* Hourly Rate */}
                    {(canViewHourlyRates || canUpdateTasks) && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          {task?.project_id ? 'Hodinovka projektu' : 'Hodinová sadzba úlohy'}
                        </label>
                        {task?.project_id ? (
                          <div className="px-3 py-2 bg-muted rounded-md text-sm text-foreground">
                            {task?.project?.hourly_rate ? `${task.project.hourly_rate.toFixed(2)}€/h` : 'Nenastavené'}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={task?.hourly_rate_cents ? (task.hourly_rate_cents / 100).toString() : ''}
                              onChange={(e) => {
                                const value = e.target.value ? parseFloat(e.target.value) : null;
                                const hourlyRateCents = value ? Math.round(value * 100) : null;
                                setTask(prev => prev ? { 
                                  ...prev, 
                                  hourly_rate_cents: hourlyRateCents
                                } : null);
                                setHasChanges(true);
                              }}
                              placeholder="0.00"
                              className="flex-1"
                              disabled={!canUpdateTasks}
                            />
                            <span className="text-sm text-muted-foreground">€/h</span>
                          </div>
                        )}
                        {!task?.project_id && (
                          <p className="text-xs text-muted-foreground">
                            Hodinová sadzba pre túto úlohu. Použije sa pri ukladaní času, ak nie je nastavená v nastaveniach.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Budget Settings */}
              {(canViewPrices || canUpdateTasks) && (
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
                        disabled={!canUpdateTasks}
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
                      onClick={() => {
                        if (task?.project_id) {
                          router.push(`/projects/${task.project_id}`);
                        } else {
                          router.push(`/tasks`);
                        }
                      }}
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
                      task.project_id ? (
                        <ProjectReport 
                          projectId={task.project_id}
                          taskId={task.id}
                        />
                      ) : (
                        <TaskReport taskId={task.id} />
                      )
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            </Tabs>
          </div>

          {/* Right Sidebar - Comments and Links */}
          <div className="w-full space-y-4">
          <Tabs value={rightSidebarTab} onValueChange={setRightSidebarTab} className="w-full">
            <TabsList>
              {canReadComments && (
                <TabsTrigger value="comments">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Komentáre</span>
                  {commentsCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                      {commentsCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="links">
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
                    taskId={taskId}
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
    </div>
  );
}