"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Edit3,
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
  ExternalLink
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

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [hasChanges, setHasChanges] = useState(false);
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

  useEffect(() => {
    fetchTask();
    fetchAssignees();
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
      saveTimeoutRef.current = setTimeout(() => {
        handleSaveDescriptionWithContent(html);
      }, 3000);
    }
  };

  const handleSave = async () => {
    if (!task || isSaving) return;

    setIsSaving(true);
    try {
      // Save task settings
      const taskResponse = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estimated_hours: task.estimated_hours,
        }),
      });

      const taskResult = await taskResponse.json();

      // Save project budget if changed
      let projectResult = { success: true };
      if (task.project?.budget !== undefined) {
        const projectResponse = await fetch(`/api/projects/${task.project_id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            budget: task.project.budget,
          }),
        });
        projectResult = await projectResponse.json();
      }

      if (taskResult.success && projectResult.success) {
        setTask(taskResult.data);
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
        setTask({ ...task, due_date: newDueDate });
        toast({
          title: "Úspech",
          description: "Deadline bol aktualizovaný",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa aktualizovať deadline",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating due date:", error);
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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${params.projectId}`)}
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Späť na projekt
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{task.project?.name}</span>
            <span>•</span>
            <span className="font-mono">{task.project?.code}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {isEditing ? 'Ukončiť úpravy' : 'Upraviť'}
          </Button>
          
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
      </div>

      {/* Task Header Card */}
      <Card className="bg-card border border-border shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{task.title}</h1>
                {deadlineBadge && (
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 ${deadlineBadge.color} rounded-full flex items-center justify-center ${
                      deadlineBadge.animate ? 'animate-pulse' : ''
                    }`}>
                      <span className="text-white text-xs font-bold">
                        {deadlineBadge.icon}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${deadlineStatus?.color} ${
                      deadlineBadge.animate ? 'animate-pulse' : ''
                    }`}>
                      {deadlineBadge.text}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StatusSelect 
                  status={task.status} 
                  onStatusChange={handleStatusChange}
                />
                
                <PrioritySelect 
                  priority={task.priority} 
                  onPriorityChange={handlePriorityChange}
                />
              </div>
            </div>


            {/* Dates */}
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-foreground">Začiatok:</span>
                <InlineDateEdit
                  value={task.start_date ? format(new Date(task.start_date), 'dd.MM.yyyy', { locale: sk }) : null}
                  placeholder="Kliknite pre nastavenie"
                  onSave={async (value) => {
                    const isoDate = value ? new Date(value).toISOString().split('T')[0] : null;
                    await handleStartDateChange(isoDate);
                  }}
                  icon={Calendar}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-foreground">Deadline:</span>
                <InlineDateEdit
                  value={task.due_date ? format(new Date(task.due_date), 'dd.MM.yyyy', { locale: sk }) : null}
                  placeholder="Kliknite pre nastavenie"
                  onSave={async (value) => {
                    const isoDate = value ? new Date(value).toISOString().split('T')[0] : null;
                    await handleDueDateChange(isoDate);
                  }}
                  icon={Calendar}
                />
              </div>
              
              {task.due_date && deadlineStatus && !deadlineStatus.showBadge && (
                <span className={cn("ml-2 font-medium", deadlineStatus.color)}>
                  ({deadlineStatus.text})
                </span>
              )}
            </div>

            {/* Assignees */}
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Priradení:</span>
              </div>
              <MultiAssigneeSelect
                taskId={task.id}
                currentAssignees={assignees}
                onAssigneesChange={handleAssigneesChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted">
              <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                <FileText className="h-4 w-4 mr-2" />
                Prehľad
              </TabsTrigger>
              <TabsTrigger value="time" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                <Clock className="h-4 w-4 mr-2" />
                Čas
              </TabsTrigger>
              <TabsTrigger value="costs" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                <Euro className="h-4 w-4 mr-2" />
                Náklady
              </TabsTrigger>
              <TabsTrigger value="report" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                <BarChart3 className="h-4 w-4 mr-2" />
                Report
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Description */}
              <Card className="bg-card border border-border shadow-sm">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-foreground">Popis úlohy</CardTitle>
                    {isSaving && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Ukladám...
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <FileUploadHandler
                    taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId}
                    onFileUploaded={(fileUrl, htmlContent) => {
                      // Files are automatically added to Files section below
                      // No need to modify description content
                      console.log('File uploaded to Files section, URL:', fileUrl);
                      // Files will be automatically refreshed by TaskFiles component
                    }}
                  >
                    <QuillEditor
                      key={task?.id}
                      content={descriptionHtml}
                      onChange={handleDescriptionChange}
                      placeholder="Napíšte popis úlohy..."
                      className="min-h-[200px]"
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

              {/* Comments */}
              <Card className="bg-card border border-border shadow-sm">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Komentáre
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <CommentsList 
                    taskId={task.id}
                    onCommentAdded={() => {
                      // Optionally refresh task data
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="time" className="mt-6">
              <Card className="bg-card border border-border shadow-sm">
                <CardContent className="p-6">
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

            <TabsContent value="costs" className="mt-6">
              <Card className="bg-card border border-border shadow-sm">
                <CardContent className="p-6">
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


            <TabsContent value="report" className="mt-6">
              <Card className="bg-card border border-border shadow-sm">
                <CardContent className="p-6">
                  <ProjectReport 
                    projectId={Array.isArray(params.projectId) ? params.projectId[0] : params.projectId}
                    taskId={task.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Billing and Time Tracking Settings */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Nastavenia
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Estimated Hours */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Odhad hodín
                </label>
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
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Natrackovaný čas
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm text-foreground">
                    {task?.actual_hours ? `${task.actual_hours}h` : '0h'}
                  </div>
                </div>
              </div>

              {/* Hourly Rate - Read Only */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  Hodinovka projektu
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm text-foreground">
                    {task?.project?.hourly_rate ? `${task.project.hourly_rate.toFixed(2)}€/h` : 'Nenastavené'}
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Rozpočet projektu
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={task?.project?.budget ? task.project.budget.toFixed(2) : ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : null;
                      setTask(prev => prev ? { 
                        ...prev, 
                        project: prev.project ? { ...prev.project, budget: value } : null 
                      } : null);
                      setHasChanges(true);
                    }}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">€</span>
                </div>
              </div>

              {/* Save Button */}
              {hasChanges && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Ukladám...
                      </>
                    ) : (
                      "Uložiť nastavenia"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Google Drive Links */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-lg font-semibold text-foreground">Google Drive</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <GoogleDriveLinks taskId={Array.isArray(params.taskId) ? params.taskId[0] : params.taskId} />
            </CardContent>
          </Card>

          {/* Project Info */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-lg font-semibold text-foreground">Projekt</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
        </div>
      </div>
    </div>
  );
}