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
import { getDeadlineStatus, getDeadlineRowClass } from "@/lib/deadline-utils";
import Link from "next/link";
import type { Task } from "@/types/database";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceInvitations } from "@/components/workspace/WorkspaceInvitations";
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
  const activitiesRef = useRef<HTMLDivElement>(null);

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
        const [tasksResponse, activitiesResponse] = await Promise.all([
          fetch(`/api/dashboard/assigned-tasks?workspace_id=${workspace.id}`),
          fetch(`/api/dashboard/activity?workspace_id=${workspace.id}`)
        ]);

        const tasksResult = await tasksResponse.json();
        const activitiesResult = await activitiesResponse.json();
        
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
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'task_update':
        return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
      case 'task_created':
        return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30';
      case 'task_completed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'comment':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
      case 'project_created':
        return 'text-violet-600 bg-violet-100 dark:bg-violet-900/30';
      case 'project_updated':
        return 'text-violet-500 bg-violet-50 dark:bg-violet-900/20';
      case 'client_created':
      case 'client_updated':
        return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
      case 'member_added':
        return 'text-pink-600 bg-pink-100 dark:bg-pink-900/30';
      case 'file_upload':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      default:
        return 'text-slate-600 bg-slate-100 dark:bg-slate-900/30';
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
      label: "To Do", 
      icon: Circle, 
      color: "bg-slate-100 text-slate-700 border-slate-200", 
      iconColor: "text-slate-500" 
    },
    in_progress: { 
      label: "In Progress", 
      icon: Play, 
      color: "bg-blue-100 text-blue-700 border-blue-200", 
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
      color: "bg-purple-100 text-purple-700 border-purple-200", 
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
      color: "bg-red-100 text-red-700 border-red-200", 
      iconColor: "text-red-500" 
    },
  };

  const priorityConfig = {
    low: { 
      label: "Low", 
      icon: ArrowDown, 
      color: "bg-emerald-100 text-emerald-700 border-emerald-200", 
      iconColor: "text-emerald-500" 
    },
    medium: { 
      label: "Medium", 
      icon: ArrowUp, 
      color: "bg-amber-100 text-amber-700 border-amber-200", 
      iconColor: "text-amber-500" 
    },
    high: { 
      label: "High", 
      icon: ArrowUpRight, 
      color: "bg-orange-100 text-orange-700 border-orange-200", 
      iconColor: "text-orange-500" 
    },
    urgent: { 
      label: "Urgent", 
      icon: Flame, 
      color: "bg-red-100 text-red-700 border-red-200", 
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Prehľad vašich projektov a úloh
          </p>
        </div>
      </div>

      {/* Workspace Invitations */}
      <WorkspaceInvitations />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Na spracovanie</CardTitle>
            <FolderKanban className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{todoTasks.length}</div>
            <p className="text-xs text-gray-500 mt-1">Úlohy na začiatok</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">V procese</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{inProgressTasks.length}</div>
            <p className="text-xs text-gray-500 mt-1">Aktívne úlohy</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Prešli deadline</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{overdueTasks.length}</div>
            <p className="text-xs text-gray-500 mt-1">Potrebujú pozornosť</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Blížia sa</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{upcomingTasks.length}</div>
            <p className="text-xs text-gray-500 mt-1">Do 7 dní</p>
          </CardContent>
        </Card>
      </div>


      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <Card className="bg-white border border-red-200 shadow-sm border-l-4 border-l-red-500">
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center gap-2 text-lg font-medium text-red-900">
                  <AlertTriangle className="h-4 w-4" />
                  Prešli deadline
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {overdueTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {overdueTasks.map((task) => {
                    const deadlineStatus = getDeadlineStatus(task.due_date);
                    return (
                      <div key={task.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-red-900 dark:text-red-100">{task.title}</h3>
                            <Badge variant="outline" className={getStatusBadgeVariant(task.status)}>
                              {getStatusText(task.status)}
                            </Badge>
                            <Badge variant="outline" className={getPriorityBadgeVariant(task.priority)}>
                              {getPriorityText(task.priority)}
                            </Badge>
                          </div>
                          <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                            {task.project?.name || 'Neznámy projekt'} ({task.project?.code || 'N/A'}) • {task.project?.client?.name || 'Neznámy klient'}
                          </p>
                          {deadlineStatus && deadlineStatus.showBadge && (
                            <Badge variant="destructive" className="text-xs">
                              {deadlineStatus.type === 'today' ? '🔥' : '⏰'} {deadlineStatus.badgeText}
                            </Badge>
                          )}
                        </div>
                        <Button asChild variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30">
                          <Link href={`/projects/${task.project?.id || 'unknown'}/tasks/${task.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}


          {/* All Assigned Tasks - Table Format */}
          <Card className="bg-white border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
                <User className="h-4 w-4" />
                Moje úlohy
                {tasks.length > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {tasks.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nemáte priradené úlohy</p>
                  <p className="text-sm mt-2">Začnite vytvorením nového projektu</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-xs font-semibold text-gray-600 py-3 px-4">Úloha</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-600 py-3 px-4">Projekt</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-600 py-3 px-4">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-600 py-3 px-4">Assignee</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-600 py-3 px-4">Priorita</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-600 py-3 px-4 w-fit">Čas</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-600 py-3 px-4 w-fit">Deadline</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const statusInfo = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
                      const priorityInfo = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                      const StatusIcon = statusInfo.icon;
                      const PriorityIcon = priorityInfo.icon;
                      const deadlineStatus = getDeadlineStatus(task.due_date);
                      
                      return (
                    <TableRow 
                      key={task.id} 
                      className={`hover:bg-gray-50 cursor-pointer group border-b border-gray-100 ${
                        deadlineStatus?.priority === 'critical' 
                          ? 'bg-red-50 border-l-4 border-l-red-400' 
                          : deadlineStatus?.priority === 'high'
                          ? 'bg-yellow-50 border-l-4 border-l-yellow-400'
                          : deadlineStatus?.priority === 'medium'
                          ? 'bg-blue-50 border-l-4 border-l-blue-400'
                          : ''
                      }`}
                      onClick={() => window.location.href = `/projects/${task.project?.id || 'unknown'}/tasks/${task.id}`}
                    >
                          <TableCell className="py-3 px-4">
                            <div className="min-w-0 space-y-1">
                              <h3 className={`font-semibold truncate text-sm group-hover:text-gray-900 ${
                                deadlineStatus?.priority === 'critical' 
                                  ? 'text-red-700' 
                                  : deadlineStatus?.priority === 'high'
                                  ? 'text-yellow-700'
                                  : deadlineStatus?.priority === 'medium'
                                  ? 'text-blue-700'
                                  : 'text-gray-800'
                              }`}>
                                {task.title}
                              </h3>
                              {deadlineStatus?.showBadge && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs px-2 py-0.5 w-fit ${
                                    deadlineStatus?.type === 'today' ? 'bg-red-100 text-red-700 border-red-300' :
                                    deadlineStatus?.type === 'tomorrow' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                    deadlineStatus?.type === 'day2' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                    deadlineStatus?.type === 'day3' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                    'bg-gray-100 text-gray-700 border-gray-300'
                                  }`}
                                >
                                  {deadlineStatus?.badgeText}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
                                {task.project?.name || 'Neznámy projekt'}
                              </div>
                              <Badge 
                                variant="outline" 
                                className="text-xs px-2 py-0.5 w-fit bg-gray-100 text-gray-600 border-gray-300"
                              >
                                {task.project?.code || 'N/A'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge 
                              variant="outline" 
                              className={`text-xs flex items-center gap-1 px-2 py-1 w-fit ${statusInfo.color}`}
                            >
                              <StatusIcon className={`h-3 w-3 ${statusInfo.iconColor}`} />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {task.assignees && task.assignees.length > 0 ? (
                                <>
                                  {task.assignees.slice(0, 4).map((assignee, index) => (
                                    <div 
                                      key={assignee.id} 
                                      className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center group/avatar relative"
                                      title={assignee.user?.name || 'Neznámy používateľ'}
                                    >
                                      <span className="text-xs text-gray-600 font-medium">
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
                                      className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center group/overflow relative"
                                      title={`Ďalší assignee: ${task.assignees.slice(4).map(a => a.user?.name).filter(Boolean).join(', ')}`}
                                    >
                                      <span className="text-xs text-gray-500">
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
                                  className="h-6 w-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center"
                                  title="Žiadny assignee"
                                >
                                  <span className="text-xs text-gray-400">?</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge 
                              variant="outline" 
                              className={`text-xs flex items-center gap-1 px-2 py-1 w-fit ${priorityInfo.color}`}
                            >
                              <PriorityIcon className={`h-3 w-3 ${priorityInfo.iconColor}`} />
                              {priorityInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 w-fit">
                            <div className="space-y-1">
                              {task.estimated_hours > 0 && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs flex items-center gap-1 px-2 py-1 w-fit bg-gray-100 text-gray-600 border-gray-300 whitespace-nowrap"
                                >
                                  <Clock className="h-3 w-3 text-gray-500" />
                                  <span>{formatHours(task.estimated_hours)}</span>
                                </Badge>
                              )}
                              {task.actual_hours > 0 && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs flex items-center gap-1 px-2 py-1 w-fit bg-green-100 text-green-600 border-green-300 whitespace-nowrap"
                                >
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span>{formatHours(task.actual_hours)}</span>
                                </Badge>
                              )}
                              {(!task.estimated_hours || task.estimated_hours === 0) && (!task.actual_hours || task.actual_hours === 0) && (
                                <span className="text-xs text-gray-400 italic">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 w-fit">
                            {task.due_date ? (
                              <Badge 
                                variant="outline" 
                                className="text-xs flex items-center gap-1 px-2 py-1 w-fit bg-gray-100 text-gray-600 border-gray-300 whitespace-nowrap"
                              >
                                <Calendar className="h-3 w-3 text-gray-500" />
                                <span>{format(new Date(task.due_date), 'dd.MM.yyyy', { locale: sk })}</span>
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-400 italic">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <div className="flex justify-center">
                              <div className="p-1 rounded group-hover:bg-gray-100">
                                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="lg:col-span-1 space-y-6">
          <Card ref={activitiesRef} className="bg-white border border-gray-200 w-full">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
                <Activity className="h-4 w-4" />
                Posledná aktivita
                {activities.length > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {activities.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-h-[600px] overflow-y-auto">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Žiadna aktivita</p>
                  <p className="text-sm mt-2">Začnite pracovať na úlohách</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(showAllActivities ? activities : activities.slice(0, 6)).map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={cn("p-2 rounded-full", getActivityColor(activity.type))}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {activity.user || 'Neznámy používateľ'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(activity.created_at), 'dd.MM.yyyy HH:mm', { locale: sk })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">
                            <span className="font-medium">{activity.action}</span> {activity.details}
                          </p>
                          {activity.project && (
                            <p className="text-xs text-gray-500">
                              {activity.project} ({activity.project_code})
                            </p>
                          )}
                          {activity.description && (
                            <p className="text-xs text-gray-500 mt-1 italic">
                              "{activity.description}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {activities.length > 6 && (
                    <div className="pt-4 border-t border-gray-200">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
