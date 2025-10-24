"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  FolderKanban,
  User,
  ArrowRight,
  Edit,
  Plus,
  MessageSquare,
  FileText,
  Users,
  FolderPlus,
  CheckCircle2,
  Building2,
  FolderOpen,
  UserPlus,
  TrendingUp,
  Activity,
  Zap,
  Target,
  BarChart3,
  PieChart,
  Timer,
  Award,
  Circle,
  Play,
  Eye,
  Send,
  XCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Flame
} from "lucide-react";
import { formatCurrency, formatHours } from "@/lib/format";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { sk } from "date-fns/locale";
import { getDeadlineStatus, getDeadlineRowClass, getDeadlineDotClass } from "@/lib/deadline-utils";
import Link from "next/link";
import type { Task } from "@/types/database";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceInvitations } from "@/components/workspace/WorkspaceInvitations";
import { TaskFilters, TaskFilter } from "@/components/tasks/TaskFilters";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { cn } from "@/lib/utils";

interface AssignedTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project_id: string;
  assignee_id: string | null;
  budget_amount: number | null;
  days_until_deadline: number | null;
  assignees?: {
    id: string;
    user_id: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  project: {
    id: string;
    name: string;
    code: string;
    client?: {
      id: string;
      name: string;
    };
  };
}

interface Activity {
  id: string;
  type: string;
  action: string;
  details: string;
  user: string;
  user_name?: string;
  created_at: string;
  project?: string;
  project_code?: string;
  client?: string;
  description?: string;
  content?: string;
  status?: string;
  priority?: string;
}

export default function DashboardPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [filters, setFilters] = useState<TaskFilter>({
    status: [],
    priority: [],
    assignee: [],
    deadline: "all",
  });
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [personalProjectId, setPersonalProjectId] = useState<string | null>(null);
  const activitiesRef = useRef<HTMLDivElement>(null);

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(task.status)) {
      return false;
    }

    // Priority filter
    if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
      return false;
    }

    // Deadline filter
    if (filters.deadline !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const taskDate = task.due_date ? new Date(task.due_date) : null;

      switch (filters.deadline) {
        case "today":
          if (!taskDate || taskDate.getTime() !== today.getTime()) return false;
          break;
        case "tomorrow":
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (!taskDate || taskDate.getTime() !== tomorrow.getTime()) return false;
          break;
        case "this_week":
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          if (!taskDate || taskDate < today || taskDate > weekEnd) return false;
          break;
        case "overdue":
          if (!taskDate || taskDate >= today) return false;
          break;
        case "no_deadline":
          if (taskDate) return false;
          break;
      }
    }

    return true;
  });

  const handleShowMoreActivities = () => {
    setShowAllActivities(true);
    // Scroll to activities section after state update
    setTimeout(() => {
      if (activitiesRef.current) {
        activitiesRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  // Scroll listener to show "Zobraziť viac" when scrolled to bottom
  useEffect(() => {
    const handleScroll = () => {
      if (activitiesRef.current && !showAllActivities) {
        const { scrollTop, scrollHeight, clientHeight } = activitiesRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
        setShowLoadMore(isAtBottom);
      }
    };

    const activitiesElement = activitiesRef.current;
    if (activitiesElement) {
      activitiesElement.addEventListener('scroll', handleScroll);
      return () => activitiesElement.removeEventListener('scroll', handleScroll);
    }
  }, [showAllActivities]);

  useEffect(() => {
    const fetchData = async () => {
      if (!workspace) return;
      
      setIsLoading(true);
      try {
        const [tasksResponse, activitiesResponse, projectsResponse] = await Promise.all([
          fetch(`/api/dashboard/assigned-tasks?workspace_id=${workspace.id}`),
          fetch(`/api/dashboard/activity?workspace_id=${workspace.id}`),
          fetch(`/api/projects`)
        ]);

        const tasksResult = await tasksResponse.json();
        const activitiesResult = await activitiesResponse.json();
        const projectsResult = await projectsResponse.json();
        
        if (tasksResult.success) {
          setTasks(tasksResult.data);
        } else {
          console.error("Failed to fetch tasks:", tasksResult.error);
        }


        if (activitiesResult.success) {
          setActivities(activitiesResult.data);
        } else {
          console.error("Failed to fetch activities:", activitiesResult.error);
        }

        // Find or create personal project
        if (projectsResult.success) {
          console.log("Available projects:", projectsResult.data);
          const personalProject = projectsResult.data.find((p: any) => 
            p.name === "Osobné úlohy" || p.code === "PERSONAL"
          );
          
          if (personalProject) {
            console.log("Found personal project:", personalProject);
            setPersonalProjectId(personalProject.id);
          } else {
            console.log("Personal project not found, creating...");
            // Create personal project if it doesn't exist
            try {
              const createResponse = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: "Osobné úlohy",
                  code: "PERSONAL",
                  description: "Projekt pre osobné úlohy bez klienta",
                  status: "active",
                  client_id: null
                })
              });
              
              const createResult = await createResponse.json();
              console.log("Create project result:", createResult);
              if (createResult.success) {
                setPersonalProjectId(createResult.data.id);
                console.log("Personal project created with ID:", createResult.data.id);
              } else {
                console.error("Failed to create personal project:", createResult.error);
              }
            } catch (error) {
              console.error("Failed to create personal project:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspace]);

  const getStatusBadgeVariant = (status: string) => {
    const variantMap: { [key: string]: string } = {
      'todo': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      'in_progress': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
      'review': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
      'done': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
      'cancelled': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
    };
    return variantMap[status] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const getPriorityBadgeVariant = (priority: string) => {
    const variantMap: { [key: string]: string } = {
      'low': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
      'medium': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
      'high': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
      'urgent': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
    };
    return variantMap[priority] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'review': 'Review',
      'done': 'Done',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'urgent': 'Urgent'
    };
    return priorityMap[priority] || priority;
  };


  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'time_entry':
        return Timer;
      case 'task_update':
        return Edit;
      case 'task_created':
        return Plus;
      case 'task_completed':
        return CheckCircle2;
      case 'comment':
        return MessageSquare;
      case 'project_created':
        return FolderPlus;
      case 'project_updated':
        return FolderOpen;
      case 'client_created':
      case 'client_updated':
        return Building2;
      case 'member_added':
        return UserPlus;
      case 'file_upload':
        return FileText;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'time_entry':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300';
      case 'task_update':
        return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300';
      case 'task_created':
        return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300';
      case 'task_completed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300';
      case 'comment':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300';
      case 'project_created':
        return 'text-violet-600 bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300';
      case 'project_updated':
        return 'text-violet-500 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-300';
      case 'client_created':
      case 'client_updated':
        return 'text-amber-600 bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300';
      case 'member_added':
        return 'text-pink-600 bg-pink-100 dark:bg-pink-900/20 dark:text-pink-300';
      case 'file_upload':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300';
      default:
        return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const statusConfig = {
    todo: { 
      label: "Todo", 
      icon: Circle, 
      color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700", 
      iconColor: "text-slate-500" 
    },
    in_progress: { 
      label: "In Progress", 
      icon: Play, 
      color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800", 
      iconColor: "text-blue-500" 
    },
    review: { 
      label: "Review", 
      icon: Eye, 
      color: "bg-amber-100 text-amber-700 border-amber-200", 
      iconColor: "text-amber-500" 
    },
    sent_to_client: { 
      label: "Sent to Client", 
      icon: Send, 
      color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800", 
      iconColor: "text-purple-500" 
    },
    done: { 
      label: "Done", 
      icon: CheckCircle, 
      color: "bg-emerald-100 text-emerald-700 border-emerald-200", 
      iconColor: "text-emerald-500" 
    },
    cancelled: { 
      label: "Cancelled", 
      icon: XCircle, 
      color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800", 
      iconColor: "text-red-500" 
    },
  };

  const priorityConfig = {
    low: { 
      label: "Low", 
      icon: ArrowDown, 
      color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800", 
      iconColor: "text-emerald-500" 
    },
    medium: { 
      label: "Medium", 
      icon: ArrowUp, 
      color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800", 
      iconColor: "text-amber-500" 
    },
    high: { 
      label: "High", 
      icon: ArrowUpRight, 
      color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800", 
      iconColor: "text-orange-500" 
    },
    urgent: { 
      label: "Urgent", 
      icon: Flame, 
      color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800", 
      iconColor: "text-red-500" 
    },
  };

  // Filter tasks by status
  const todoTasks = tasks.filter(task => task.status === 'todo');
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
  const reviewTasks = tasks.filter(task => task.status === 'review');
  const doneTasks = tasks.filter(task => task.status === 'done');
  
  // Tasks with deadlines
  const tasksWithDeadlines = tasks.filter(task => task.due_date);
  const overdueTasks = tasksWithDeadlines.filter(task => task.days_until_deadline !== null && task.days_until_deadline < 0);
  const upcomingTasks = tasksWithDeadlines.filter(task => task.days_until_deadline !== null && task.days_until_deadline >= 0 && task.days_until_deadline <= 7);

  // Calculate stats
  const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
  const totalActualHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
  const completionRate = totalEstimatedHours > 0 ? (totalActualHours / totalEstimatedHours) * 100 : 0;

  if (workspaceLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Načítavam dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-base mt-2">
            Prehľad vašich projektov a úloh
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              console.log("Quick task button clicked, personalProjectId:", personalProjectId);
              setIsQuickTaskOpen(true);
            }}
            disabled={!personalProjectId}
            className="bg-gray-900 text-white hover:bg-gray-800"
            title={personalProjectId ? "Vytvoriť rýchlu úlohu" : "Čaká sa na vytvorenie osobného projektu..."}
          >
            <Plus className="h-4 w-4 mr-2" />
            Rýchla úloha {!personalProjectId && "(načítava...)"}
          </Button>
        </div>
      </div>

      {/* Workspace Invitations */}
      <WorkspaceInvitations />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Na spracovanie</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{todoTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Úlohy na začiatok</p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">V procese</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{inProgressTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Aktívne úlohy</p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prešli deadline</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{overdueTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Potrebujú pozornosť</p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Blížia sa</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{upcomingTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Do 7 dní</p>
          </CardContent>
        </Card>
      </div>


      {/* Main Content - Single Column */}
      <div className="w-full">
        {/* Tasks and Activity Section */}
        <div className="w-full">
          {/* Combined Tasks and Activity Block */}
          <Card className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] divide-x divide-border">
                {/* Tasks Section */}
                <div className="min-h-[600px]">
                  <div className="px-6 py-4 bg-muted/50 border-b border-border/50">
                    <div className="flex items-center gap-3 text-lg font-semibold text-foreground">
                      <div className="p-2 bg-primary rounded-lg">
                        <User className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span>Moje úlohy</span>
                        {filteredTasks.length > 0 && (
                          <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-background border-border text-foreground">
                            {filteredTasks.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
              {/* Task Filters */}
              <div className="px-6 py-4 border-b border-border/50">
                <TaskFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  totalTasks={tasks.length}
                  filteredTasks={filteredTasks.length}
                />
              </div>
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-foreground">
                    {tasks.length === 0 ? "Nemáte priradené úlohy" : "Žiadne úlohy nevyhovujú filtrom"}
                  </p>
                  <p className="text-sm mt-2 text-muted-foreground">
                    {tasks.length === 0 ? "Začnite vytvorením nového projektu" : "Skúste zmeniť filtre"}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/80 hover:bg-muted border-b border-border">
                        <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Úloha</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Projekt</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Assignee</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Priorita</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Čas</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Deadline</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => {
                      const statusInfo = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
                      const priorityInfo = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                      const StatusIcon = statusInfo.icon;
                      const PriorityIcon = priorityInfo.icon;
                      const deadlineStatus = getDeadlineStatus(task.due_date);
                      
                      return (
                    <TableRow 
                      key={task.id} 
                      className="hover:bg-accent/50 cursor-pointer group border-b border-border/50 transition-all duration-200"
                      onClick={() => window.location.href = `/projects/${task.project?.id || 'unknown'}/tasks/${task.id}`}
                    >
                          <TableCell className="py-4 pl-6 pr-2">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 flex-shrink-0">
                                  {deadlineStatus && (
                                    <div className={getDeadlineDotClass(deadlineStatus)}></div>
                                  )}
                                </div>
                                <h3 className="font-semibold truncate text-sm group-hover:text-foreground text-foreground">
                                  {task.title}
                                </h3>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 pl-6 pr-2">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-foreground group-hover:text-foreground">
                                {task.project?.name || 'Neznámy projekt'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {task.project?.code || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 pl-6 pr-2">
                            <div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-full border w-fit whitespace-nowrap ${statusInfo.color}`}
                              >
                                <StatusIcon className={`h-3 w-3 flex-shrink-0 ${statusInfo.iconColor}`} />
                                <span className="flex-shrink-0">{statusInfo.label}</span>
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 pl-6 pr-2">
                            <div className="flex items-center gap-1">
                              {task.assignees && task.assignees.length > 0 ? (
                                <>
                                  {task.assignees.slice(0, 4).map((assignee, index) => (
                                    <div 
                                      key={assignee.id} 
                                      className="h-6 w-6 rounded-full bg-muted flex items-center justify-center group/avatar relative"
                                      title={assignee.user?.name || 'Neznámy používateľ'}
                                    >
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {assignee.user?.name ? assignee.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                                      </span>
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                        {assignee.user?.name || 'Neznámy používateľ'}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                      </div>
                                    </div>
                                  ))}
                                  {task.assignees.length > 4 && (
                                    <div 
                                      className="h-6 w-6 rounded-full bg-muted flex items-center justify-center group/overflow relative"
                                      title={`Ďalší assignee: ${task.assignees.slice(4).map(a => a.user?.name).filter(Boolean).join(', ')}`}
                                    >
                                      <span className="text-xs text-muted-foreground">
                                        +{task.assignees.length - 4}
                                      </span>
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/overflow:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                        {task.assignees.slice(4).map(a => a.user?.name).filter(Boolean).join(', ')}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div 
                                  className="h-6 w-6 rounded-full border-2 border-dashed border-border flex items-center justify-center"
                                  title="Žiadny assignee"
                                >
                                  <span className="text-xs text-muted-foreground">?</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 pl-6 pr-2">
                            <div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-full border w-fit whitespace-nowrap ${priorityInfo.color}`}
                              >
                                <PriorityIcon className={`h-3 w-3 flex-shrink-0 ${priorityInfo.iconColor}`} />
                                <span className="flex-shrink-0">{priorityInfo.label}</span>
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 pl-6 pr-2 w-fit">
                            <div className="space-y-1">
                              {task.estimated_hours && task.estimated_hours > 0 && (
                                <div className="text-xs flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span>{formatHours(task.estimated_hours)}</span>
                                </div>
                              )}
                              {task.actual_hours && task.actual_hours > 0 && (
                                <div className="text-xs flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span>{formatHours(task.actual_hours)}</span>
                                </div>
                              )}
                              {(!task.estimated_hours || task.estimated_hours === 0) && (!task.actual_hours || task.actual_hours === 0) && (
                                <span className="text-xs text-muted-foreground italic">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 pl-6 pr-2 w-fit">
                            <div>
                              {task.due_date ? (
                                <div className="text-xs flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span>{format(new Date(task.due_date), 'dd.MM.yyyy', { locale: sk })}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <div className="flex justify-center">
                              <div className="p-1 rounded group-hover:bg-muted">
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground" />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              )}
                </div>
                
                {/* Activity Section */}
                <div className="min-h-[600px]">
                  <div className="px-6 py-4 bg-muted/50 border-b border-border/50">
                    <div className="flex items-center gap-3 text-lg font-semibold text-foreground">
                      <div className="p-2 bg-gray-900 rounded-lg">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span>Posledná aktivita</span>
                        {activities.length > 0 && (
                          <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-card border-border text-foreground">
                            {activities.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-6 max-h-[600px] overflow-y-auto">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Žiadna aktivita</p>
                  <p className="text-sm mt-2">Začnite pracovať na úlohách</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(showAllActivities ? activities : activities.slice(0, 6)).map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={cn("p-2 rounded-full", getActivityColor(activity.type))}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {activity.user || 'Neznámy používateľ'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), 'dd.MM.yyyy HH:mm', { locale: sk })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mb-1">
                            <span className="font-medium">{activity.action}</span> {activity.details}
                          </p>
                          {activity.project && (
                            <p className="text-xs text-muted-foreground">
                              {activity.project} ({activity.project_code})
                            </p>
                          )}
                          {activity.description && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              "{activity.description}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {activities.length > 6 && (
                    <div className="pt-4 border-t border-border">
                      {showAllActivities ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllActivities(false)}
                          className="w-full"
                        >
                          Zobraziť menej
                        </Button>
                      ) : (
                        showLoadMore && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleShowMoreActivities}
                            className="w-full"
                          >
                            Zobraziť viac ({activities.length - 6} ďalších)
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Task Dialog */}
      {personalProjectId && (
        <TaskDialog
          projectId={personalProjectId}
          open={isQuickTaskOpen}
          onOpenChange={setIsQuickTaskOpen}
            onSuccess={() => {
              // Refresh tasks and activities
              const fetchData = async () => {
                try {
                  const [tasksResponse, activitiesResponse] = await Promise.all([
                    fetch(`/api/dashboard/assigned-tasks?workspace_id=${workspace?.id}`),
                    fetch(`/api/dashboard/activity?workspace_id=${workspace?.id}`)
                  ]);

                  const tasksResult = await tasksResponse.json();
                  const activitiesResult = await activitiesResponse.json();
                  
                  if (tasksResult.success) {
                    setTasks(tasksResult.data);
                  }
                  if (activitiesResult.success) {
                    setActivities(activitiesResult.data);
                  }
                } catch (error) {
                  console.error("Error refreshing data:", error);
                }
              };
              fetchData();
            }}
        />
      )}
    </div>
  );
}
