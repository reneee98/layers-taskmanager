"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  FolderKanban,
  User,
  ArrowRight,
  MessageSquare,
  Upload,
  Edit,
  Plus
} from "lucide-react";
import { formatCurrency, formatHours } from "@/lib/format";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { sk } from "date-fns/locale";
import Link from "next/link";
import type { Task } from "@/types/database";

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
    client: {
      name: string;
    };
  };
}

interface Activity {
  id: string;
  type: 'time_entry' | 'task_update' | 'comment' | 'file_upload';
  action: string;
  details: string;
  project?: string;
  project_code?: string;
  user: string;
  created_at: string;
  description?: string;
  content?: string;
  status?: string;
  priority?: string;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tasks and activities in parallel
        const [tasksResponse, activitiesResponse] = await Promise.all([
          fetch("/api/dashboard/assigned-tasks"),
          fetch("/api/dashboard/activity")
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
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    const variantMap: { [key: string]: string } = {
      'todo': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      'in_progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'review': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'done': 'bg-green-500/10 text-green-500 border-green-500/20',
      'cancelled': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return variantMap[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getPriorityBadgeVariant = (priority: string) => {
    const variantMap: { [key: string]: string } = {
      'low': 'bg-green-500/10 text-green-500 border-green-500/20',
      'medium': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'high': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'urgent': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return variantMap[priority] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'todo': 'Na spracovanie',
      'in_progress': 'V procese',
      'review': 'Na kontrolu',
      'done': 'Hotové',
      'cancelled': 'Zrušené'
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      'low': 'Nízka',
      'medium': 'Stredná',
      'high': 'Vysoká',
      'urgent': 'Urgentné'
    };
    return priorityMap[priority] || priority;
  };

  const getDeadlineStatus = (daysUntilDeadline: number | null) => {
    if (daysUntilDeadline === null) return null;
    
    if (daysUntilDeadline < 0) {
      return { type: 'overdue', text: `Prešiel o ${Math.abs(daysUntilDeadline)} dní`, icon: AlertTriangle, color: 'text-red-500' };
    } else if (daysUntilDeadline === 0) {
      return { type: 'today', text: 'Dnes', icon: AlertTriangle, color: 'text-orange-500' };
    } else if (daysUntilDeadline <= 3) {
      return { type: 'urgent', text: `Zostáva ${daysUntilDeadline} dní`, icon: Clock, color: 'text-yellow-500' };
    } else if (daysUntilDeadline <= 7) {
      return { type: 'soon', text: `Zostáva ${daysUntilDeadline} dní`, icon: Clock, color: 'text-blue-500' };
    }
    
    return null;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'time_entry':
        return Clock;
      case 'task_update':
        return Edit;
      case 'comment':
        return MessageSquare;
      case 'file_upload':
        return Upload;
      default:
        return Plus;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'time_entry':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'task_update':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'comment':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
      case 'file_upload':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
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

  // Filter tasks by status
  const todoTasks = tasks.filter(task => task.status === 'todo');
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
  const reviewTasks = tasks.filter(task => task.status === 'review');
  const doneTasks = tasks.filter(task => task.status === 'done');
  
  // Tasks with deadlines
  const tasksWithDeadlines = tasks.filter(task => task.due_date);
  const overdueTasks = tasksWithDeadlines.filter(task => task.days_until_deadline !== null && task.days_until_deadline < 0);
  const upcomingTasks = tasksWithDeadlines.filter(task => task.days_until_deadline !== null && task.days_until_deadline >= 0 && task.days_until_deadline <= 7);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Prehľad vašich priradených úloh a blížiacich sa deadline-ov
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na spracovanie</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todoTasks.length}</div>
            <p className="text-xs text-muted-foreground">Úlohy na začiatok</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">V procese</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks.length}</div>
            <p className="text-xs text-muted-foreground">Aktívne úlohy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prešli deadline</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueTasks.length}</div>
            <p className="text-xs text-muted-foreground">Potrebujú pozornosť</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blížia sa</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTasks.length}</div>
            <p className="text-xs text-muted-foreground">Do 7 dní</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Prešli deadline ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueTasks.map((task) => {
                const deadlineStatus = getDeadlineStatus(task.days_until_deadline);
                return (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{task.title}</h3>
                        <Badge variant="outline" className={getStatusBadgeVariant(task.status)}>
                          {getStatusText(task.status)}
                        </Badge>
                        <Badge variant="outline" className={getPriorityBadgeVariant(task.priority)}>
                          {getPriorityText(task.priority)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.project?.name || 'Neznámy projekt'} ({task.project?.code || 'N/A'}) • {task.project?.client?.name || 'Neznámy klient'}
                      </p>
                      {deadlineStatus && (
                        <Badge variant="destructive" className="text-xs">
                          <deadlineStatus.icon className="h-3 w-3 mr-1" />
                          {deadlineStatus.text}
                        </Badge>
                      )}
                    </div>
                    <Button asChild variant="outline" size="sm">
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

      {/* Upcoming Deadlines */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Blížia sa deadline ({upcomingTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => {
                const deadlineStatus = getDeadlineStatus(task.days_until_deadline);
                return (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{task.title}</h3>
                        <Badge variant="outline" className={getStatusBadgeVariant(task.status)}>
                          {getStatusText(task.status)}
                        </Badge>
                        <Badge variant="outline" className={getPriorityBadgeVariant(task.priority)}>
                          {getPriorityText(task.priority)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.project?.name || 'Neznámy projekt'} ({task.project?.code || 'N/A'}) • {task.project?.client?.name || 'Neznámy klient'}
                      </p>
                      {deadlineStatus && (
                        <Badge variant="secondary" className="text-xs">
                          <deadlineStatus.icon className="h-3 w-3 mr-1" />
                          {deadlineStatus.text}
                        </Badge>
                      )}
                    </div>
                    <Button asChild variant="outline" size="sm">
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* All Assigned Tasks - Compact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Moje úlohy{tasks.length > 0 && ` (${tasks.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nemáte priradené úlohy</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const deadlineStatus = getDeadlineStatus(task.days_until_deadline);
                    return (
                      <Link 
                        key={task.id} 
                        href={`/projects/${task.project?.id || 'unknown'}/tasks/${task.id}`}
                        className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate">{task.title}</h3>
                              <Badge variant="outline" className={getStatusBadgeVariant(task.status)}>
                                {getStatusText(task.status)}
                              </Badge>
                              <Badge variant="outline" className={getPriorityBadgeVariant(task.priority)}>
                                {getPriorityText(task.priority)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {task.project?.name || 'Neznámy projekt'} ({task.project?.code || 'N/A'})
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              {task.estimated_hours && task.estimated_hours > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatHours(task.estimated_hours)}
                                </span>
                              )}
                              {task.actual_hours && task.actual_hours > 0 && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  {formatHours(task.actual_hours)}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(task.due_date), 'dd.MM', { locale: sk })}
                                </span>
                              )}
                            </div>
                            {deadlineStatus && (
                              <Badge 
                                variant={deadlineStatus.type === 'overdue' ? 'destructive' : 'secondary'} 
                                className="text-xs mt-1"
                              >
                                <deadlineStatus.icon className="h-2 w-2 mr-1" />
                                {deadlineStatus.text}
                              </Badge>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground ml-3" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Aktivity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Žiadne aktivity</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activities.map((activity) => {
                    const ActivityIcon = getActivityIcon(activity.type);
                    
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="p-2 rounded-lg bg-muted">
                          <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(activity.user)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{activity.user}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), 'HH:mm', { locale: sk })}
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
                          {activity.content && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              "{activity.content.substring(0, 100)}{activity.content.length > 100 ? '...' : ''}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
