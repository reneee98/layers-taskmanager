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
  Share2,
  Archive,
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
  X
} from "lucide-react";
import { TimePanel } from "@/components/time/TimePanel";
import { CostsPanel } from "@/components/costs/CostsPanel";
import { ProjectReport } from "@/components/report/ProjectReport";
import { CommentsList } from "@/components/comments/CommentsList";
import { QuillEditor } from "@/components/ui/quill-editor";
import { MultiAssigneeSelect } from "@/components/tasks/MultiAssigneeSelect";
import { StatusSelect } from "@/components/tasks/StatusSelect";
import { PrioritySelect } from "@/components/tasks/PrioritySelect";
import { InlineDateEdit } from "@/components/ui/inline-date-edit";
import { GoogleDriveLinks } from "@/components/tasks/GoogleDriveLinks";
import { TaskChecklist } from "@/components/tasks/TaskChecklist";
import { TaskFiles } from "@/components/tasks/TaskFiles";
import { FileUploadHandler } from "@/components/tasks/FileUploadHandler";
import { toast } from "@/hooks/use-toast";
import { formatHours } from "@/lib/format";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { Task, TaskAssignee } from "@/types/database";
import { cn } from "@/lib/utils";
import { getDeadlineStatus, getDeadlineBadge } from "@/lib/deadline-utils";
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
import type { Project } from "@/types/database";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing] = useState(true); // Always in editing mode
  const [activeTab, setActiveTab] = useState("overview");
  const [rightSidebarTab, setRightSidebarTab] = useState("comments");
  const [hasChanges, setHasChanges] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [linksCount, setLinksCount] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.taskId}`);
      const result = await response.json();

      if (result.success) {
        setTask(result.data);
        setDescription(result.data.description || "");
        setDescriptionHtml(result.data.description || "");
        setAssignees(result.data.assignees || []);
        setHasChanges(false);
      } else {
        toast({
          title: "Chyba",
          description: "Úloha nebola nájdená",
          variant: "destructive",
        });
      }
    } catch (error) {
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
      console.error("Failed to fetch assignees:", error);
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
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchCommentsCount = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.taskId}/comments`);
      const result = await response.json();
      if (result.success) {
        setCommentsCount(result.data?.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch comments count:", error);
    }
  };

  const fetchLinksCount = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.taskId}/drive-links`);
      const result = await response.json();
      if (result.success) {
        setLinksCount(result.data?.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch links count:", error);
    }
  };

  useEffect(() => {
    fetchTask();
    fetchAssignees();
    fetchProjects();
    fetchCommentsCount();
    fetchLinksCount();
  }, [params.taskId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
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

  const handleProjectChange = async (newProjectId: string) => {
    if (!task || newProjectId === task.project_id) return;
    
    try {
      const response = await fetch(`/api/tasks/${params.taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: newProjectId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reload task to get updated project data
        await fetchTask();
        toast({
          title: "Úspech",
          description: "Úloha bola presunutá do iného projektu",
        });
        // Dispatch event to refresh project summary
        window.dispatchEvent(new CustomEvent('taskStatusChanged', { 
          detail: { taskId: params.taskId, projectId: newProjectId } 
        }));
        // Redirect to new project's task page
        router.push(`/projects/${newProjectId}/tasks/${params.taskId}`);
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
    
    console.log('[Frontend] handleDueDateChange called:', {
      taskId: params.taskId,
      oldDueDate: task.due_date,
      newDueDate: newDueDate
    });
    
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
      console.log('[Frontend] API response:', {
        success: result.success,
        data: result.data,
        error: result.error,
        returnedStartDate: result.data?.start_date,
        oldStartDate: task.start_date
      });

      if (result.success) {
        // Update task with returned data (includes updated start_date if it was auto-set)
        const updatedTask = { ...task, due_date: newDueDate, start_date: result.data?.start_date || task.start_date };
        console.log('[Frontend] Updating task with:', {
          due_date: updatedTask.due_date,
          start_date: updatedTask.start_date
        });
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
      console.error("[Frontend] Error updating due date:", error);
      console.error("[Frontend] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať deadline",
        variant: "destructive",
      });
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
          <p className="text-muted-foreground">Skúste obnoviť stránku alebo sa vráťte na projekt</p>
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
          <Select
            value={task.project_id}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-auto h-auto border-none shadow-none hover:bg-accent px-2 py-1 data-[state=open]:bg-accent">
              <SelectValue>
                <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <span className="font-medium">{task.project?.name}</span>
                  <span>•</span>
                  <span className="font-mono text-xs">{task.project?.code}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({project.code})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplikovať
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 className="h-4 w-4 mr-2" />
              Zdieľať
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Archive className="h-4 w-4 mr-2" />
              Archivovať
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Vymazať
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Compact Task Header */}
      <Card className="bg-card border border-border shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Title and Project Info */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground truncate">{task.title}</h1>
                  {deadlineBadge && task.status !== "done" && task.status !== "cancelled" && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`w-5 h-5 ${deadlineBadge.color} rounded-full flex items-center justify-center ${
                        deadlineBadge.animate ? 'animate-pulse' : ''
                      }`}>
                        <span className="text-white text-xs font-bold">
                          {deadlineBadge.icon}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${deadlineStatus?.color} ${
                        deadlineBadge.animate ? 'animate-pulse' : ''
                      }`}>
                        {deadlineBadge.text}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Project Select */}
                <Select
                  value={task.project_id}
                  onValueChange={handleProjectChange}
                >
                  <SelectTrigger className="w-auto h-auto border-none shadow-none hover:bg-accent px-2 py-1 data-[state=open]:bg-accent">
                    <SelectValue>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <span className="font-medium">{task.project?.name}</span>
                        <span>•</span>
                        <span className="font-mono text-xs">{task.project?.code}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{project.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            ({project.code})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Play className="h-4 w-4" />
                      Začiatok
                    </div>
                    {task.start_date && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartDateChange(null)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        title="Zrušiť dátum"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <InlineDateEdit
                    value={task.start_date ? format(new Date(task.start_date), 'dd.MM.yyyy', { locale: sk }) : null}
                    placeholder="Nastaviť dátum"
                    onSave={async (value) => {
                      const isoDate = value ? new Date(value).toISOString().split('T')[0] : null;
                      await handleStartDateChange(isoDate);
                    }}
                    icon={Calendar}
                  />
                </div>
                
                {/* Due Date */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Flag className="h-4 w-4" />
                      Deadline
                    </div>
                    {task.due_date && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDueDateChange(null)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        title="Zrušiť deadline"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <InlineDateEdit
                    value={task.due_date ? format(new Date(task.due_date), 'dd.MM.yyyy', { locale: sk }) : null}
                    placeholder="Nastaviť deadline"
                    onSave={async (value) => {
                      // InlineDateEdit with type="date" returns value in YYYY-MM-DD format
                      // If value is already in ISO format, use it directly
                      // Otherwise try to parse it
                      let isoDate: string | null = null;
                      if (value) {
                        // Check if value is already in YYYY-MM-DD format
                        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                          isoDate = value;
                        } else {
                          // Try to parse other formats
                          const parsed = new Date(value);
                          if (!isNaN(parsed.getTime())) {
                            isoDate = parsed.toISOString().split('T')[0];
                          }
                        }
                      }
                      console.log('[Frontend] Parsing due_date:', { value, isoDate });
                      await handleDueDateChange(isoDate);
                    }}
                    icon={Calendar}
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
                  />
                </div>
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
              <TabsTrigger value="time" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Clock className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Čas</span>
              </TabsTrigger>
              <TabsTrigger value="costs" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Euro className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Náklady</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nastavenia</span>
              </TabsTrigger>
              <TabsTrigger value="report" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Report</span>
              </TabsTrigger>
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

            <TabsContent value="costs" className="mt-4">
              <Card className="bg-card border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Náklady
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CostsPanel 
                    projectId={Array.isArray(params.projectId) ? params.projectId[0] : params.projectId} 
                    tasks={[task]}
                    defaultTaskId={task.id}
                    onCostAdded={() => {
                      fetchTask();
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Hodinovka projektu</label>
                      <div className="px-3 py-2 bg-muted rounded-md text-sm text-foreground">
                        {task?.project?.hourly_rate ? `${task.project.hourly_rate.toFixed(2)}€/h` : 'Nenastavené'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Budget Settings */}
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

            <TabsContent value="report" className="mt-4">
              <Card className="bg-card border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ProjectReport 
                    projectId={Array.isArray(params.projectId) ? params.projectId[0] : params.projectId}
                    taskId={task.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-80 space-y-4 order-first xl:order-last">
          <Tabs value={rightSidebarTab} onValueChange={setRightSidebarTab} className="w-full">
            <TabsList className="inline-flex h-9 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="comments" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Komentáre</span>
                {commentsCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                    {commentsCount}
                  </Badge>
                )}
              </TabsTrigger>
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