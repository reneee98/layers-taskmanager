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
  Calendar as CalendarIcon,
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
  ArrowLeft,
  Flame,
  List,
  CalendarDays
} from "lucide-react";
import { formatCurrency, formatHours } from "@/lib/format";
import { format, isAfter, isBefore, addDays, isToday, parse, startOfWeek, getDay } from "date-fns";
import { sk } from "date-fns/locale";
import dynamic from 'next/dynamic';

const Calendar = dynamic(
  () => import('react-big-calendar').then(mod => mod.Calendar),
  { ssr: false }
);

import { dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getDeadlineStatus, getDeadlineRowClass, getDeadlineDotClass } from "@/lib/deadline-utils";
import Link from "next/link";
import type { Task } from "@/types/database";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceInvitations } from "@/components/workspace/WorkspaceInvitations";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { filterTasksByTab, getTaskCountsByTab, DashboardTabType } from "@/lib/dashboard-filters";
import { cn } from "@/lib/utils";

const locales = {
  sk: sk,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: locales.sk }),
  getDay,
  locales,
});

interface AssignedTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
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
  const [activeTab, setActiveTab] = useState<DashboardTabType>("today");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [personalProjectId, setPersonalProjectId] = useState<string | null>(null);
  const activitiesRef = useRef<HTMLDivElement>(null);

  type ViewMode = "list" | "calendar";

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "next") {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear(calendarYear + 1);
      } else {
        setCalendarMonth(calendarMonth + 1);
      }
    } else {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear(calendarYear - 1);
      } else {
        setCalendarMonth(calendarMonth - 1);
      }
    }
  };

  // Filter tasks based on active tab
  const filteredTasks = filterTasksByTab(tasks, activeTab);
  
  // Get task counts for each tab
  const taskCounts = getTaskCountsByTab(tasks);

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
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
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
                <div>
                  <div className="px-6 py-4 bg-muted/50 border-b border-border/50">
                    <div className="flex items-center justify-between">
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
                      {/* Zoznam / Kalendár prepínač */}
                      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="w-auto">
                        <TabsList className="inline-flex h-9 items-center justify-center rounded-md bg-background p-1 text-muted-foreground border border-border">
                          <TabsTrigger value="list" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                            <List className="h-4 w-4" />
                            <span className="ml-2">Zoznam</span>
                          </TabsTrigger>
                          <TabsTrigger value="calendar" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                            <CalendarIcon className="h-4 w-4" />
                            <span className="ml-2">Kalendár</span>
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
              {/* Dashboard Tabs */}
              <div className="px-6 py-4 border-b border-border/50">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTabType)} className="w-full">
                  <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                    <TabsTrigger value="all_active" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                      <List className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Všetky aktívne</span>
                      {taskCounts.all_active > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                          {taskCounts.all_active}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="today" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Úlohy dnes</span>
                      {taskCounts.today > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                          {taskCounts.today}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="this_week" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Tento týždeň</span>
                      {taskCounts.this_week > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                          {taskCounts.this_week}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="overdue" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Po termíne</span>
                      {taskCounts.overdue > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                          {taskCounts.overdue}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="sent_to_client" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                      <Send className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Poslané klientovi</span>
                      {taskCounts.sent_to_client > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                          {taskCounts.sent_to_client}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="in_progress" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                      <Play className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">In progress</span>
                      {taskCounts.in_progress > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-gray-200 text-gray-700">
                          {taskCounts.in_progress}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {/* Conditional rendering based on view mode */}
              {viewMode === "list" ? (
                <>
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-foreground">
                    {tasks.length === 0 ? "Nemáte priradené úlohy" : "Žiadne úlohy v tejto kategórii"}
                  </p>
                  <p className="text-sm mt-2 text-muted-foreground">
                    {tasks.length === 0 ? "Začnite vytvorením nového projektu" : "Skúste vybrať inú kategóriu"}
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
                                  <CalendarIcon className="h-3 w-3 text-muted-foreground" />
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
                </>
              ) : (
                <div className="px-6 pt-6 pb-12 h-[900px]">
                  {/* Custom Apple-style toolbar */}
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-foreground tracking-tight">
                      {format(new Date(calendarYear, calendarMonth, 1), 'MMMM yyyy', { locale: sk })}
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigateMonth("prev")}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          setCalendarMonth(new Date().getMonth());
                          setCalendarYear(new Date().getFullYear());
                        }}
                        className="px-4 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium text-foreground"
                      >
                        Dnes
                      </button>
                      <button
                        onClick={() => navigateMonth("next")}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  <style>{`
                    .rbc-calendar {
                      background: transparent;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display', system-ui, sans-serif;
                    }
                    .rbc-header {
                      padding: 20px 0 0 0;
                      font-weight: 600;
                      font-size: 11px;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                      color: rgb(107, 114, 128);
                      border-bottom: none;
                      text-align: right;
                    }
                    .dark .rbc-header {
                      color: rgb(156, 163, 175);
                    }
                    .rbc-today {
                      background-color: transparent;
                    }
                    .rbc-day-bg {
                      border: none;
                      border-right: 1px solid rgba(0, 0, 0, 0.04);
                      border-bottom: 1px solid rgba(0, 0, 0, 0.04);
                      min-height: 125px;
                      background: transparent;
                      transition: background 0.15s ease;
                      padding-bottom: 14px;
                    }
                    .dark .rbc-day-bg,
                    .dark .rbc-month-row .rbc-day-bg,
                    html.dark .rbc-day-bg,
                    html.dark .rbc-month-row .rbc-day-bg,
                    body.dark .rbc-day-bg,
                    body.dark .rbc-month-row .rbc-day-bg,
                    .dark .rbc-month-row,
                    html.dark .rbc-month-row,
                    body.dark .rbc-month-row {
                      border-right: 1px solid hsl(var(--border)) !important;
                      border-bottom: 1px solid hsl(var(--border)) !important;
                      border-left: none !important;
                      border-top: none !important;
                    }
                    .rbc-day-bg.rbc-off-range-bg {
                      background: rgba(0, 0, 0, 0.02);
                    }
                    .dark .rbc-day-bg.rbc-off-range-bg {
                      background: rgba(255, 255, 255, 0.03);
                    }
                    .rbc-off-range-bg .rbc-date-cell {
                      color: rgb(156, 163, 175) !important;
                      opacity: 0.4 !important;
                    }
                    .rbc-date-cell.rbc-off-range {
                      color: rgb(156, 163, 175) !important;
                      opacity: 0.4 !important;
                    }
                    /* Highlight only Saturday and Sunday columns - target all cells */
                    .rbc-month-row .rbc-day-bg:nth-child(6),
                    .rbc-month-row .rbc-day-bg:nth-child(7) {
                      background: rgba(0, 0, 0, 0.04) !important;
                    }
                    .dark .rbc-month-row .rbc-day-bg:nth-child(6),
                    .dark .rbc-month-row .rbc-day-bg:nth-child(7) {
                      background: rgba(255, 255, 255, 0.06) !important;
                    }
                    .rbc-day-bg:last-child {
                      border-right: none;
                    }
                    .rbc-day-bg:hover {
                      background: rgba(0, 0, 0, 0.01);
                    }
                    .dark .rbc-day-bg:hover {
                      background: rgba(255, 255, 255, 0.02);
                    }
                    .rbc-off-range-bg {
                      background: transparent;
                    }
                    .rbc-month-row {
                      margin-top: 0 !important;
                      padding-top: 0 !important;
                      padding-bottom: 4px !important;
                    }
                    .rbc-day-bg.rbc-today {
                      background-color: rgba(var(--primary-rgb), 0.04);
                    }
                    .dark .rbc-day-bg.rbc-today {
                      background-color: rgba(59, 130, 246, 0.15);
                    }
                    .rbc-date-cell {
                      padding: 10px 12px;
                      font-weight: 500;
                      font-size: 15px;
                      color: #1f2937;
                      transition: all 0.15s ease;
                      text-align: right;
                    }
                    .dark .rbc-date-cell {
                      color: #e5e7eb;
                    }
                    .rbc-off-range-bg .rbc-day-bg .rbc-date-cell {
                      color: rgb(156, 163, 175);
                    }
                    .rbc-day-bg.rbc-today .rbc-date-cell {
                      color: white !important;
                      font-weight: 600;
                      background: hsl(var(--primary));
                      width: 28px;
                      height: 28px;
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      border-radius: 50%;
                    }
                    .rbc-event {
                      border: none;
                      border-radius: 3px;
                      padding: 1px 4px;
                      font-size: 10px;
                      font-weight: 500;
                      margin: 1px 2px;
                      cursor: pointer;
                      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    }
                    .rbc-event:hover {
                      opacity: 0.85;
                      transform: translateY(-1px);
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
                    }
                    .rbc-month-row {
                      border-color: transparent;
                    }
                    .rbc-toolbar {
                      margin-bottom: 40px;
                      padding: 0;
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                    }
                    .rbc-toolbar button {
                      color: #6b7280;
                      background: transparent;
                      border: none;
                      cursor: pointer;
                      padding: 8px 12px;
                      border-radius: 6px;
                      font-weight: 500;
                      font-size: 14px;
                      transition: all 0.15s ease;
                      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    }
                    .rbc-toolbar button:hover {
                      background: rgba(0, 0, 0, 0.04);
                      color: #1f2937;
                    }
                    .rbc-toolbar button:active {
                      background: rgba(0, 0, 0, 0.08);
                      transform: scale(0.96);
                    }
                    .rbc-toolbar button.rbc-active {
                      background: transparent;
                      color: #1f2937;
                      font-weight: 600;
                    }
                    .rbc-toolbar-label {
                      font-size: 24px;
                      font-weight: 600;
                      color: #1f2937;
                      letter-spacing: -0.5px;
                    }
                    .rbc-month-view {
                      border: none;
                    }
                    .rbc-month-row {
                      border: none;
                    }
                    .rbc-toolbar-label-container {
                      display: flex;
                      align-items: center;
                      gap: 12px;
                    }
                    .rbc-toolbar button.rbc-toolbar-label {
                      padding: 0;
                      font-size: 24px;
                      font-weight: 600;
                      color: #1f2937;
                      letter-spacing: -0.5px;
                      cursor: default;
                    }
                    .rbc-toolbar button.rbc-toolbar-label:hover {
                      background: transparent;
                    }
                  `}</style>
                  <div className="h-full">
                    <Calendar
                      localizer={localizer}
                      events={filteredTasks
                        .filter(task => task.due_date)
                        .map(task => {
                          // Use start_date if available, otherwise use due_date
                          const startDate = task.start_date 
                            ? new Date(task.start_date + 'T00:00:00')
                            : new Date(task.due_date + 'T00:00:00');
                          
                          // Use end_date if available, otherwise use due_date
                          const endDate = task.end_date
                            ? new Date(task.end_date + 'T00:00:00')
                            : new Date(task.due_date + 'T00:00:00');

                          // For all-day events in react-big-calendar, end should be the start of next day
                          const exclusiveEndDate = addDays(endDate, 1);

                          return {
                            id: task.id,
                            title: task.title,
                            start: startDate,
                            end: exclusiveEndDate,
                            allDay: true,
                            resource: task,
                          };
                        })}
                      views={['month']}
                      defaultView="month"
                      culture="sk"
                      toolbar={false}
                      date={new Date(calendarYear, calendarMonth, 1)}
                      onSelectEvent={(event: any) => {
                        window.location.href = `/projects/${event.resource.project?.id || 'unknown'}/tasks/${event.resource.id}`;
                      }}
                      eventPropGetter={(event: any) => {
                        // Check if dark mode is active
                        const isDarkMode = document.documentElement.classList.contains('dark');
                        
                        // Generate consistent color based on task ID hash - soft tints with base color text
                        const colorSchemes = isDarkMode ? [
                          { bg: 'rgba(30, 64, 175, 0.15)', text: '#93c5fd' }, // soft blue tint (dark mode)
                          { bg: 'rgba(6, 95, 70, 0.15)', text: '#6ee7b7' }, // soft emerald tint (dark mode)
                          { bg: 'rgba(146, 64, 14, 0.15)', text: '#fbbf24' }, // soft amber tint (dark mode)
                          { bg: 'rgba(91, 33, 182, 0.15)', text: '#c4b5fd' }, // soft purple tint (dark mode)
                          { bg: 'rgba(159, 18, 57, 0.15)', text: '#f9a8d4' }, // soft pink tint (dark mode)
                          { bg: 'rgba(14, 116, 144, 0.15)', text: '#67e8f9' }, // soft cyan tint (dark mode)
                          { bg: 'rgba(55, 48, 163, 0.15)', text: '#a5b4fc' }, // soft indigo tint (dark mode)
                          { bg: 'rgba(19, 78, 74, 0.15)', text: '#5eead4' }, // soft teal tint (dark mode)
                          { bg: 'rgba(154, 52, 18, 0.15)', text: '#fb923c' }, // soft orange tint (dark mode)
                          { bg: 'rgba(107, 33, 168, 0.15)', text: '#c084fc' }, // soft violet tint (dark mode)
                        ] : [
                          { bg: '#dbeafe', text: '#1e40af' }, // soft blue tint, dark blue text
                          { bg: '#d1fae5', text: '#065f46' }, // soft emerald tint, dark emerald text
                          { bg: '#fef3c7', text: '#92400e' }, // soft amber tint, dark amber text
                          { bg: '#e9d5ff', text: '#5b21b6' }, // soft purple tint, dark purple text
                          { bg: '#fce7f3', text: '#9f1239' }, // soft pink tint, dark pink text
                          { bg: '#cffafe', text: '#0e7490' }, // soft cyan tint, dark cyan text
                          { bg: '#e0e7ff', text: '#3730a3' }, // soft indigo tint, dark indigo text
                          { bg: '#ccfbf1', text: '#134e4a' }, // soft teal tint, dark teal text
                          { bg: '#fed7aa', text: '#9a3412' }, // soft orange tint, dark orange text
                          { bg: '#f3e8ff', text: '#6b21a8' }, // soft violet tint, dark violet text
                        ];
                        
                        // Simple hash function to get consistent color for same task
                        let hash = 0;
                        for (let i = 0; i < event.resource.id.length; i++) {
                          hash = event.resource.id.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        const colorIndex = Math.abs(hash) % colorSchemes.length;
                        const colorScheme = colorSchemes[colorIndex];
                        
                        return {
                          style: {
                            backgroundColor: colorScheme.bg,
                            color: colorScheme.text,
                            border: 'none',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '13px',
                            fontWeight: '500',
                          }
                        };
                      }}
                      components={{
                        month: {
                          header: ({ date }: any) => (
                            <div className="px-3 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                              {format(date, 'EEE', { locale: sk })}
                            </div>
                          ),
                          dateHeader: ({ date, label }: any) => {
                            const isTodayDate = isToday(date);
                            return (
                              <div
                                className={cn(
                                  "text-sm font-medium transition-colors px-3 py-2",
                                  isTodayDate 
                                    ? "bg-black rounded-full w-7 h-7 flex items-center justify-center text-white ml-auto"
                                    : "text-right"
                                )}
                              >
                                {label}
                              </div>
                            );
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
                </div>
                
                {/* Activity Section */}
                <div className="h-full flex flex-col">
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
                  <div className="p-6 flex-1 overflow-y-auto">
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
