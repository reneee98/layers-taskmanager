"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermission } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Plus,
  Users,
  CheckCircle2,
  Target,
  BarChart3,
  PieChart,
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
  X,
  FolderX,
} from "lucide-react";
import { formatCurrency, formatHours } from "@/lib/format";
import { format, isAfter, isBefore, addDays, isToday, parse, startOfWeek, getDay } from "date-fns";
import { sk } from "date-fns/locale";
import dynamic from "next/dynamic";
import { dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { getDeadlineStatus, getDeadlineRowClass, getDeadlineDotClass } from "@/lib/deadline-utils";
import Link from "next/link";
import type { Task } from "@/types/database";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardPermissions } from "@/hooks/useDashboardPermissions";
import { useWorkspaceUsers } from "@/contexts/WorkspaceUsersContext";

// Direct imports for faster initial load (these are small components)
import { TaskDialog } from "@/components/tasks/TaskDialog";

// Only lazy load truly heavy components
const Calendar = dynamic(() => import("react-big-calendar").then((mod) => mod.Calendar), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { filterTasksByTab, getTaskCountsByTab, DashboardTabType } from "@/lib/dashboard-filters";
import { cn, stripHtml, truncateTaskTitle } from "@/lib/utils";
import { getTaskStatusLabel } from "@/lib/task-status";
import { normalizeTaskColor, taskColorToRgba } from "@/lib/task-colors";
import { StatusSelect } from "@/components/tasks/StatusSelect";
import { PrioritySelect } from "@/components/tasks/PrioritySelect";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/types/database";
import {
  DashboardWorkspace,
  type DashboardProjectItem,
} from "@/components/dashboard/dashboard-workspace";

// Lazy load WeekCalendar - only load when calendar view is active
const WeekCalendar = dynamic(
  () => import("@/components/calendar/WeekCalendar").then((mod) => ({ default: mod.WeekCalendar })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: false,
  }
);

interface DashboardAssigneeCellProps {
  task: any; // Using any to avoid type issues with AssignedTask vs Task
  onTaskUpdate: (taskId: string, updates: { status?: string; priority?: string }) => Promise<void>;
}

function DashboardAssigneeCell({ task, onTaskUpdate }: DashboardAssigneeCellProps) {
  const { users: workspaceUsers } = useWorkspaceUsers();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Map workspace users to Profile format
  const users = useMemo(() => {
    return workspaceUsers
      .filter((wu) => wu.profiles) // Filter out entries without profiles
      .map((wu) => wu.profiles as Profile);
  }, [workspaceUsers]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddAssignee = async (userId: string) => {
    if (userId === "none") return;

    const currentAssigneeIds = (task.assignees || []).map((a: any) => a.user_id || a.id);
    if (currentAssigneeIds.includes(userId)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/assignees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigneeIds: [...currentAssigneeIds, userId],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsOpen(false);
        // Refresh dashboard task lists without a full page reload
        window.dispatchEvent(new CustomEvent("taskStatusChanged"));
        toast({
          title: "Úspech",
          description: "Používateľ bol priradený k úlohe",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa priradiť používateľa",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to add assignee:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa priradiť používateľa",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    const currentAssigneeIds = (task.assignees || []).map((a: any) => a.user_id || a.id);
    const newAssigneeIds = currentAssigneeIds.filter((id: any) => id !== userId);

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/assignees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigneeIds: newAssigneeIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh dashboard task lists without a full page reload
        window.dispatchEvent(new CustomEvent("taskStatusChanged"));
        toast({
          title: "Úspech",
          description: "Používateľ bol odstránený z úlohy",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa odstrániť používateľa",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to remove assignee:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť používateľa",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const availableUsers = users.filter((user) => {
    const currentAssigneeIds = (task.assignees || []).map((a: any) => a.user_id || a.id);
    return !currentAssigneeIds.includes(user.id);
  });

  return (
    <div className="flex items-center gap-1">
      {task.assignees && task.assignees.length > 0 ? (
        <>
          {task.assignees.slice(0, 4).map((assignee: any, index: number) => {
            const assigneeId = assignee.user_id || assignee.id;
            const assigneeName =
              (assignee as any).user?.name ||
              (assignee as any).display_name ||
              (assignee as any).email ||
              "Neznámy používateľ";
            return (
              <div
                key={assignee.id}
                className="h-6 w-6 rounded-full bg-muted flex items-center justify-center group/avatar relative"
                title={assigneeName}
              >
                <span className="text-xs text-muted-foreground font-medium">
                  {assigneeName !== "Neznámy používateľ"
                    ? assigneeName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "?"}
                </span>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {assigneeName}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full p-0 bg-black text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAssignee(assigneeId);
                  }}
                  disabled={isLoading}
                >
                  <X className="h-2 w-2" />
                </Button>
              </div>
            );
          })}
          {task.assignees.length > 4 && (
            <div
              className="h-6 w-6 rounded-full bg-muted flex items-center justify-center group/overflow relative"
              title={`Ďalší assignee: ${task.assignees
                .slice(4)
                .map(
                  (a: any) => (a as any).user?.name || (a as any).display_name || (a as any).email
                )
                .filter(Boolean)
                .join(", ")}`}
            >
              <span className="text-xs text-muted-foreground">+{task.assignees.length - 4}</span>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/overflow:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {task.assignees
                  .slice(4)
                  .map(
                    (a: any) => (a as any).user?.name || (a as any).display_name || (a as any).email
                  )
                  .filter(Boolean)
                  .join(", ")}
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
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 rounded-full p-0 hover:bg-accent border border-dashed border-border hover:border-solid"
            disabled={isLoading || availableUsers.length === 0}
            title="Pridať používateľa"
            aria-label="Pridať používateľa k úlohe"
          >
            <Plus className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {availableUsers.length === 0 ? (
            <DropdownMenuItem disabled>Všetci používatelia sú už priradení</DropdownMenuItem>
          ) : (
            availableUsers.map((user) => {
              const userName =
                (user as any).name || (user as any).display_name || user.email || "Neznámy";
              return (
                <DropdownMenuItem
                  key={user.id}
                  onClick={() => handleAddAssignee(user.id)}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{userName}</span>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AssignedTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  color?: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  assignee_id: string | null;
  budget_cents: number | null;
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
    status?: string;
    client?: {
      id: string;
      name: string;
    };
  } | null;
}

const legacyDashboardEnabled = false;

export default function DashboardPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  // Check permissions for different sections
  const { hasPermission: canViewProjects, isLoading: isLoadingProjectsPermission } = usePermission(
    "pages",
    "view_projects"
  );
  const { hasPermission: canViewTasks, isLoading: isLoadingTasksPermission } = usePermission(
    "pages",
    "view_tasks"
  );
  const { hasPermission: canViewClients } = usePermission("pages", "view_clients");
  const { hasPermission: canReadProjects, isLoading: isLoadingReadProjectsPermission } =
    usePermission("projects", "read");
  const { hasPermission: canReadTasks, isLoading: isLoadingReadTasksPermission } = usePermission(
    "tasks",
    "read"
  );
  const { hasPermission: canUpdateTasks } = usePermission("tasks", "update");
  const { hasPermission: canReadClients } = usePermission("clients", "read");

  // Dashboard visibility permissions - don't block on this
  const { permissions: dashboardPermissions } = useDashboardPermissions();

  const isLoadingPermissions =
    isLoadingProjectsPermission ||
    isLoadingTasksPermission ||
    isLoadingReadProjectsPermission ||
    isLoadingReadTasksPermission;
  const [tasks, setTasks] = useState<AssignedTask[]>([]); // Priradené používateľovi
  const [allActiveTasks, setAllActiveTasks] = useState<AssignedTask[]>([]); // Všetky aktívne v workspace
  const [unassignedTasks, setUnassignedTasks] = useState<AssignedTask[]>([]); // Nepriradené
  const [dashboardProjects, setDashboardProjects] = useState<DashboardProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false); // Prevent duplicate fetches
  const lastFetchWorkspaceIdRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTabType>("today");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarDate, setCalendarDate] = useState(() => {
    // Initialize with today's date, ensuring it's set to start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [personalProjectId, setPersonalProjectId] = useState<string | null>(null);
  const [moreEventsModalOpen, setMoreEventsModalOpen] = useState(false);
  const [moreEventsDate, setMoreEventsDate] = useState<Date | null>(null);
  const [moreEventsTasks, setMoreEventsTasks] = useState<AssignedTask[]>([]);

  // Get workspace users from context for the user filter dropdown
  const { users: contextWorkspaceUsers } = useWorkspaceUsers();
  const workspaceUsers = useMemo(() => {
    return contextWorkspaceUsers
      .filter((wu) => wu.profiles) // Filter out entries without profiles
      .map((wu) => ({
        id: wu.profiles.id,
        name: wu.profiles.display_name || wu.profiles.email,
        email: wu.profiles.email,
      }));
  }, [contextWorkspaceUsers]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // null = všetci používatelia

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

  const navigateWeek = (direction: "prev" | "next") => {
    const normalizedDate = new Date(calendarDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(normalizedDate, { locale: sk, weekStartsOn: 1 });
    const newWeekStart = addDays(weekStart, direction === "next" ? 7 : -7);
    setCalendarDate(newWeekStart);
    setCalendarMonth(newWeekStart.getMonth());
    setCalendarYear(newWeekStart.getFullYear());
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (calendarView === "week") {
      navigateWeek(direction);
    } else {
      navigateMonth(direction);
    }
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCalendarDate(today);
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: { status?: string; priority?: string; due_date?: string | null }
  ) => {
    if (!canUpdateTasks) {
      toast({
        title: "Chyba",
        description: "Nemáte oprávnenie na úpravu úloh",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        const updateTaskInState = (taskList: AssignedTask[]) => {
          return taskList.map((task) => (task.id === taskId ? { ...task, ...updates } : task));
        };

        setTasks(updateTaskInState(tasks));
        setAllActiveTasks(updateTaskInState(allActiveTasks));
        setUnassignedTasks(updateTaskInState(unassignedTasks));

        toast({
          title: "Úspech",
          description: "Úloha bola aktualizovaná",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa aktualizovať úlohu",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať úlohu",
        variant: "destructive",
      });
    }
  };

  const handleTimeTracked = (taskId: string, hours: number) => {
    if (hours <= 0) return;

    const addTrackedHours = (taskList: AssignedTask[]) =>
      taskList.map((task) =>
        task.id === taskId
          ? {
              ...task,
              actual_hours: Math.round(((task.actual_hours || 0) + hours) * 1000) / 1000,
            }
          : task
      );

    setTasks((currentTasks) => addTrackedHours(currentTasks));
    setAllActiveTasks((currentTasks) => addTrackedHours(currentTasks));
    setUnassignedTasks((currentTasks) => addTrackedHours(currentTasks));
  };

  const handleMoreEventsClick = (events: any[], date: Date) => {
    // Get tasks for this date from calendar tasks (already filtered by user)
    const dateTasks = calendarTasks.filter((task) => {
      if (!task.due_date) return false;

      const taskDate = new Date(task.due_date + "T00:00:00");
      const startDate = task.start_date ? new Date(task.start_date + "T00:00:00") : taskDate;
      const endDate = task.end_date ? new Date(task.end_date + "T00:00:00") : taskDate;

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      return startDate <= dayEnd && endDate >= dayStart;
    });

    setMoreEventsDate(date);
    setMoreEventsTasks(dateTasks);
    setMoreEventsModalOpen(true);
  };

  // Filter tasks based on active tab
  // Pre "all_active" používame všetky aktívne tasky
  // Pre "unassigned" používame nepriradené tasky
  // Pre "sent_to_client" používame všetky tasky (priradené + nepriradené) aby sa zobrazili aj nepriradené
  // Pre "today" používame úlohy priradené aktuálnemu používateľovi
  // Pre ostatné taby používame priradené tasky
  let tasksToFilter: AssignedTask[];
  if (activeTab === "all_active") {
    tasksToFilter = allActiveTasks;
  } else if (activeTab === "unassigned") {
    tasksToFilter = unassignedTasks;
  } else if (
    activeTab === "sent_to_client" ||
    activeTab === "this_week" ||
    activeTab === "todo" ||
    activeTab === "review" ||
    activeTab === "done"
  ) {
    // Stavové taby ukazujú všetky úlohy vo workspace (priradené aj nepriradené)
    tasksToFilter = [...allActiveTasks, ...unassignedTasks];
  } else if (activeTab === "today") {
    // Use tasks assigned to current user for "today" tab
    tasksToFilter = tasks;
  } else if (activeTab === "in_progress") {
    // Pre "in_progress" používame všetky aktívne tasky
    tasksToFilter = allActiveTasks;
  } else {
    tasksToFilter = tasks;
  }
  const filteredTasks = filterTasksByTab(tasksToFilter, activeTab);

  // Filter tasks for calendar by selected user - use useMemo to recalculate when dependencies change
  const calendarTasks = useMemo(() => {
    let filteredTasks = allActiveTasks;

    // Exclude tasks with status "sent_to_client" from calendar
    filteredTasks = filteredTasks.filter((task) => task.status !== "sent_to_client");

    // Filter by selected user if one is selected
    if (selectedUserId) {
      filteredTasks = filteredTasks.filter((task) => {
        // Check if task has assignees and if selected user is among them
        // Also check assignee_id for backward compatibility
        if (task.assignee_id === selectedUserId) {
          return true;
        }
        if (task.assignees && task.assignees.length > 0) {
          return task.assignees.some((assignee) => assignee.user_id === selectedUserId);
        }
        return false; // Skip unassigned tasks when filtering by user
      });
    }

    return filteredTasks;
  }, [allActiveTasks, selectedUserId]);

  // Create localizer inside component to avoid SSR issues
  const localizer = useMemo(() => {
    const locales = {
      sk: sk,
    };
    return dateFnsLocalizer({
      format,
      parse,
      startOfWeek: () => startOfWeek(new Date(), { locale: locales.sk }),
      getDay,
      locales,
    });
  }, []);

  // Get task counts for each tab
  const taskCounts = useMemo(() => {
    // Stavové taby počítame zo všetkých úloh vo workspace (priradené aj nepriradené)
    const allWorkspaceTasks = [...allActiveTasks, ...unassignedTasks];

    return {
      all_active: filterTasksByTab(allActiveTasks, "all_active").length,
      unassigned: filterTasksByTab(unassignedTasks, "unassigned").length,
      today: filterTasksByTab(tasks, "today").length, // Use tasks (assigned to current user) for accurate count
      this_week: filterTasksByTab(allWorkspaceTasks, "this_week").length,
      todo: filterTasksByTab(allWorkspaceTasks, "todo").length,
      sent_to_client: filterTasksByTab(allWorkspaceTasks, "sent_to_client").length,
      in_progress: filterTasksByTab(allActiveTasks, "in_progress").length,
      review: filterTasksByTab(allWorkspaceTasks, "review").length,
      done: filterTasksByTab(allWorkspaceTasks, "done").length,
      no_project: filterTasksByTab(allActiveTasks, "no_project").length,
    };
  }, [tasks, allActiveTasks, unassignedTasks]);

  // Ensure calendar events are visible - especially important for Vercel SSR
  useEffect(() => {
    if (legacyDashboardEnabled && calendarView === "month") {
      const ensureEventsVisible = () => {
        const events = document.querySelectorAll(".rbc-event");
        events.forEach((event: any) => {
          if (event) {
            event.style.display = "block";
            event.style.visibility = "visible";
            event.style.opacity = "1";
            event.style.height = "auto";
            event.style.minHeight = "20px";
          }
        });
      };

      // Run immediately and after a delay to catch SSR hydration
      ensureEventsVisible();
      const timeout = setTimeout(ensureEventsVisible, 100);
      const interval = setInterval(ensureEventsVisible, 500);

      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    }
  }, [calendarView, calendarMonth, calendarYear, calendarTasks.length]);

  // Style "+XY more" buttons in calendar
  useEffect(() => {
    if (legacyDashboardEnabled && calendarView === "month") {
      const styleMoreButtons = () => {
        const moreButtons = document.querySelectorAll(
          ".rbc-show-more, .rbc-button-link.rbc-show-more, .rbc-event-more"
        );
        const root = document.documentElement;
        const isDark = root.classList.contains("dark");

        // Get actual CSS variable values
        const getCSSVarValue = (varName: string) => {
          const value = getComputedStyle(root).getPropertyValue(varName).trim();
          if (value) {
            // Convert HSL values like "240 4.8% 96%" to "hsl(240, 4.8%, 96%)"
            const parts = value.split(" ");
            if (parts.length === 3) {
              return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
            }
            return value;
          }
          return "";
        };

        const mutedBgValue = getCSSVarValue("--muted");
        const mutedFgValue = getCSSVarValue("--muted-foreground");
        const accentBgValue = getCSSVarValue("--accent");
        const accentFgValue = getCSSVarValue("--accent-foreground");

        // Fallback colors if CSS vars not available
        const mutedBg = mutedBgValue || (isDark ? "rgba(39, 39, 42, 1)" : "rgba(244, 244, 245, 1)");
        const mutedFg =
          mutedFgValue || (isDark ? "rgba(161, 161, 170, 1)" : "rgba(113, 113, 122, 1)");
        const accentBg =
          accentBgValue || (isDark ? "rgba(39, 39, 42, 1)" : "rgba(244, 244, 245, 1)");
        const accentFg =
          accentFgValue || (isDark ? "rgba(250, 250, 250, 1)" : "rgba(24, 24, 27, 1)");

        moreButtons.forEach((button: any) => {
          if (button && !button.dataset.styled) {
            button.dataset.styled = "true";

            // Reset and apply all styles - blue link style
            const blueColor = isDark ? "rgba(96, 165, 250, 1)" : "rgba(37, 99, 235, 1)"; // blue-400 in dark, blue-600 in light
            const blueHover = isDark ? "rgba(147, 197, 253, 1)" : "rgba(59, 130, 246, 1)"; // blue-300 in dark, blue-500 in light

            button.setAttribute(
              "style",
              `
              border: none !important;
              border-radius: 6px !important;
              padding: 6px 10px !important;
              font-size: 12px !important;
              font-weight: 500 !important;
              margin: 2px 1px !important;
              margin-top: 2px !important;
              cursor: pointer !important;
              transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
              line-height: 1.4 !important;
              height: auto !important;
              min-height: 24px !important;
              color: ${blueColor} !important;
              background: transparent !important;
              display: inline-flex !important;
              align-items: center !important;
              justify-content: center !important;
              box-shadow: none !important;
              text-decoration: underline !important;
              text-underline-offset: 2px !important;
            `
            );

            // Remove any existing hover handlers
            const handleMouseEnter = () => {
              button.style.color = blueHover;
              button.style.textDecoration = "underline";
              button.style.textUnderlineOffset = "2px";
            };

            const handleMouseLeave = () => {
              button.style.color = blueColor;
              button.style.textDecoration = "underline";
              button.style.textUnderlineOffset = "2px";
            };

            button.addEventListener("mouseenter", handleMouseEnter);
            button.addEventListener("mouseleave", handleMouseLeave);
          }
        });
      };

      // Style immediately and also watch for new buttons
      const timeout = setTimeout(styleMoreButtons, 100);
      const interval = setInterval(styleMoreButtons, 500);

      // Also use MutationObserver to catch dynamically added buttons
      const observer = new MutationObserver(() => {
        setTimeout(styleMoreButtons, 50);
      });
      const calendarElement = document.querySelector(".rbc-calendar");
      if (calendarElement) {
        observer.observe(calendarElement, { childList: true, subtree: true });
      }

      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
        observer.disconnect();
      };
    }
  }, [calendarView, calendarMonth, calendarYear]);

  // Fetch dashboard data when workspace changes
  useEffect(() => {
    const fetchData = async () => {
      if (!workspace || isLoadingPermissions) return;

      // Prevent duplicate fetches
      if (isFetchingRef.current || lastFetchWorkspaceIdRef.current === workspace.id) {
        return;
      }

      isFetchingRef.current = true;
      lastFetchWorkspaceIdRef.current = workspace.id;
      setIsLoading(true);

      try {
        // OPTIMIZED: Use mega-batch endpoint - loads everything in 1 request
        const initResult = await fetch(`/api/dashboard/init?workspace_id=${workspace.id}`).then(
          (r) => r.json()
        );

        if (initResult?.success && initResult.data) {
          // Process tasks
          if (canReadTasks || canViewTasks) {
            setTasks(initResult.data.tasks?.assigned || []);
            setAllActiveTasks(initResult.data.tasks?.allActive || []);
            setUnassignedTasks(initResult.data.tasks?.unassigned || []);
          }

          // Process projects
          if (canReadProjects || canViewProjects) {
            const projects = initResult.data.projects || [];
            setDashboardProjects(projects);
            const personalProject = projects.find(
              (p: any) =>
                p.name === "Osobné úlohy" ||
                (p.code && (p.code === "PERSONAL" || p.code.startsWith("PERSONAL-")))
            );
            if (personalProject) {
              setPersonalProjectId(personalProject.id);
            }
          }

          // OPTIMIZED: Share data with contexts via custom event to avoid duplicate requests
          window.dispatchEvent(
            new CustomEvent("dashboard-init-data", {
              detail: {
                workspaceId: workspace.id,
                workspaceUsers: initResult.data.workspaceUsers || [],
                invitations: initResult.data.invitations || [],
              },
            })
          );
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchData();
  }, [
    workspace?.id,
    isLoadingPermissions,
    canReadTasks,
    canViewTasks,
    canReadProjects,
    canViewProjects,
  ]);

  // Reset fetch ref when workspace changes (to allow refetch on workspace switch)
  useEffect(() => {
    if (workspace?.id !== lastFetchWorkspaceIdRef.current) {
      lastFetchWorkspaceIdRef.current = null;
    }
  }, [workspace?.id]);

  // Listen for task status changes to refresh stats
  useEffect(() => {
    const handleTaskStatusChanged = async () => {
      if (!workspace) return;

      try {
        // Refresh tasks data when status changes
        const [assignedTasksResponse, allActiveTasksResponse, unassignedTasksResponse] =
          await Promise.all([
            fetch(
              `/api/dashboard/assigned-tasks?workspace_id=${workspace.id}&show_unassigned=false&show_all=false`
            ),
            fetch(
              `/api/dashboard/assigned-tasks?workspace_id=${workspace.id}&show_unassigned=false&show_all=true`
            ),
            fetch(
              `/api/dashboard/assigned-tasks?workspace_id=${workspace.id}&show_unassigned=true`
            ),
          ]);

        const assignedTasksResult = await assignedTasksResponse.json();
        const allActiveTasksResult = await allActiveTasksResponse.json();
        const unassignedTasksResult = await unassignedTasksResponse.json();

        if (assignedTasksResult.success) {
          setTasks(assignedTasksResult.data);
        }
        if (allActiveTasksResult.success) {
          setAllActiveTasks(allActiveTasksResult.data);
        }
        if (unassignedTasksResult.success) {
          setUnassignedTasks(unassignedTasksResult.data);
        }
      } catch (error) {
        console.error("Error refreshing dashboard data:", error);
      }
    };

    window.addEventListener("taskStatusChanged", handleTaskStatusChanged);
    return () => {
      window.removeEventListener("taskStatusChanged", handleTaskStatusChanged);
    };
  }, [workspace]);

  const getStatusBadgeVariant = (status: string) => {
    const variantMap: { [key: string]: string } = {
      todo: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      in_progress:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
      review:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
      done: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
      cancelled:
        "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
    };
    return (
      variantMap[status] ||
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    );
  };

  const getPriorityBadgeVariant = (priority: string) => {
    const variantMap: { [key: string]: string } = {
      low: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
      medium:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
      high: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
      urgent:
        "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
    };
    return (
      variantMap[priority] ||
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    );
  };

  const getStatusText = (status: string) => {
    return getTaskStatusLabel(status) || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      low: "Low",
      medium: "Medium",
      high: "High",
      urgent: "Urgent",
    };
    return priorityMap[priority] || priority;
  };

  // Filter tabs based on dashboard permissions
  const getAvailableTabs = (): DashboardTabType[] => {
    const allTabs: DashboardTabType[] = [
      "all_active",
      "today",
      "this_week",
      "todo",
      "in_progress",
      "review",
      "sent_to_client",
      "done",
      "unassigned",
    ];
    return allTabs.filter((tab) => {
      switch (tab) {
        case "all_active":
          return dashboardPermissions.show_tab_all_active;
        case "today":
          return dashboardPermissions.show_tab_today;
        case "sent_to_client":
          return dashboardPermissions.show_tab_sent_to_client;
        case "in_progress":
          return dashboardPermissions.show_tab_in_progress;
        case "unassigned":
          return dashboardPermissions.show_tab_unassigned;
        default:
          return true;
      }
    });
  };

  const availableTabs = getAvailableTabs();

  // If current activeTab is not available, switch to first available tab
  useEffect(() => {
    if (!availableTabs.includes(activeTab) && availableTabs.length > 0) {
      setActiveTab(availableTabs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTabs.length, activeTab]);

  const getTabLabel = (tab: DashboardTabType) => {
    const labels: Record<DashboardTabType, string> = {
      all_active: "Všetky aktívne",
      today: "Úlohy dnes",
      this_week: "Najbližších 7 dní",
      todo: "Na spracovanie",
      in_progress: "V procese",
      review: "Na kontrole",
      sent_to_client: "Odoslané klientovi",
      done: "Dokončené",
      unassigned: "Nepriradené",
      no_project: "Bez projektu",
    };
    return labels[tab] || tab;
  };

  const getTabIcon = (tab: DashboardTabType) => {
    switch (tab) {
      case "all_active":
        return List;
      case "today":
        return CalendarIcon;
      case "this_week":
        return Target;
      case "todo":
        return Circle;
      case "sent_to_client":
        return Send;
      case "in_progress":
        return Play;
      case "review":
        return Eye;
      case "done":
        return CheckCircle2;
      case "unassigned":
        return User;
      case "no_project":
        return FolderX;
      default:
        return List;
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
      label: getTaskStatusLabel("todo"),
      icon: Circle,
      color:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      iconColor: "text-slate-500",
    },
    in_progress: {
      label: getTaskStatusLabel("in_progress"),
      icon: Play,
      color:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
      iconColor: "text-blue-500",
    },
    review: {
      label: getTaskStatusLabel("review"),
      icon: Eye,
      color: "bg-amber-100 text-amber-700 border-amber-200",
      iconColor: "text-amber-500",
    },
    sent_to_client: {
      label: getTaskStatusLabel("sent_to_client"),
      icon: Send,
      color:
        "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
      iconColor: "text-purple-500",
    },
    done: {
      label: getTaskStatusLabel("done"),
      icon: CheckCircle,
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      iconColor: "text-emerald-500",
    },
    cancelled: {
      label: getTaskStatusLabel("cancelled"),
      icon: XCircle,
      color:
        "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
      iconColor: "text-red-500",
    },
  };

  const priorityConfig = {
    low: {
      label: "Low",
      icon: ArrowDown,
      color:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
      iconColor: "text-emerald-500",
    },
    medium: {
      label: "Medium",
      icon: ArrowUp,
      color:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      iconColor: "text-amber-500",
    },
    high: {
      label: "High",
      icon: ArrowUpRight,
      color:
        "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
      iconColor: "text-orange-500",
    },
    urgent: {
      label: "Urgent",
      icon: Flame,
      color:
        "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
      iconColor: "text-red-500",
    },
  };

  // Filter tasks by status
  const todoTasks = tasks.filter((task) => task.status === "todo");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const reviewTasks = tasks.filter((task) => task.status === "review");
  const doneTasks = tasks.filter((task) => task.status === "done");

  // Tasks with deadlines
  const tasksWithDeadlines = tasks.filter((task) => task.due_date);
  const overdueTasks = tasksWithDeadlines.filter(
    (task) => task.days_until_deadline !== null && task.days_until_deadline < 0
  );
  const upcomingTasks = tasksWithDeadlines.filter(
    (task) =>
      task.days_until_deadline !== null &&
      task.days_until_deadline >= 0 &&
      task.days_until_deadline <= 7
  );

  // Calculate stats
  const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
  const totalActualHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
  const completionRate =
    totalEstimatedHours > 0 ? (totalActualHours / totalEstimatedHours) * 100 : 0;

  const workspaceTasks = useMemo(() => {
    const tasksById = new Map<string, AssignedTask>();
    [...allActiveTasks, ...unassignedTasks].forEach((task) => tasksById.set(task.id, task));
    return Array.from(tasksById.values());
  }, [allActiveTasks, unassignedTasks]);

  if (workspaceLoading || isLoading || isLoadingPermissions) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"></div>
          <p className="text-sm text-muted-foreground">Načítavam dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <DashboardWorkspace
        tasks={tasks}
        workspaceTasks={workspaceTasks}
        projects={dashboardProjects}
        canUpdateTasks={canUpdateTasks}
        showStats={dashboardPermissions.show_stats_overview}
        showTasks={dashboardPermissions.show_tasks_section}
        showProjects={canReadProjects || canViewProjects}
        quickTaskDisabled={!personalProjectId}
        onQuickTask={() => setIsQuickTaskOpen(true)}
        onUpdateTask={handleUpdateTask}
        onTimeTracked={handleTimeTracked}
      />

      {/* Header */}
      <div className="hidden">
        <div>
          <h1 className="page-heading">Dashboard</h1>
          <p className="page-description">Prehľad vašich projektov a úloh</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setIsQuickTaskOpen(true);
            }}
            disabled={!personalProjectId}
            className="h-9"
            title={
              personalProjectId
                ? "Vytvoriť rýchlu úlohu"
                : "Čaká sa na vytvorenie osobného projektu..."
            }
          >
            <Plus className="h-4 w-4" />
            Rýchla úloha {!personalProjectId && "(načítava...)"}
          </Button>
        </div>
      </div>

      {/* Stats overview */}
      {false && dashboardPermissions.show_stats_overview && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Card 1: Úlohy na začiatok */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-5 flex items-start justify-between">
                {/* Icon container */}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </div>
                {/* Badge */}
                {todoTasks.length > 0 && (
                  <div className="flex h-5 items-center gap-1 rounded-md bg-muted px-1.5">
                    <ArrowUp className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[10px] font-medium leading-4 text-muted-foreground">
                      +{todoTasks.length} nové
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-2xl font-semibold leading-8 tracking-tight text-foreground tabular-nums">
                  {todoTasks.length}
                </div>
                <p className="text-xs leading-4 text-muted-foreground">Úlohy na začiatok</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Aktívne úlohy */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-5 flex items-start justify-between">
                {/* Icon container */}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                {/* Badge */}
                {inProgressTasks.length > 0 && (
                  <div className="flex h-5 items-center gap-1 rounded-md bg-muted px-1.5">
                    <ArrowDown className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[10px] font-medium leading-4 text-muted-foreground">
                      -1 od včera
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-2xl font-semibold leading-8 tracking-tight text-foreground tabular-nums">
                  {inProgressTasks.length}
                </div>
                <p className="text-xs leading-4 text-muted-foreground">Aktívne úlohy</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Potrebujú pozornosť */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-5 flex items-start justify-between">
                {/* Icon container */}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                {/* Badge - červený */}
                {overdueTasks.length > 0 && (
                  <div className="flex h-5 items-center gap-1 rounded-md bg-red-500/10 px-1.5">
                    <ArrowUp className="h-2.5 w-2.5 text-destructive" />
                    <span className="text-[10px] font-medium leading-4 text-destructive">
                      +{overdueTasks.length} kritická
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-2xl font-semibold leading-8 tracking-tight text-foreground tabular-nums">
                  {overdueTasks.length}
                </div>
                <p className="text-xs leading-4 text-muted-foreground">Potrebujú pozornosť</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Do 7 dní */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-5 flex items-start justify-between">
                {/* Icon container */}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50">
                  <CalendarIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-2xl font-semibold leading-8 tracking-tight text-foreground tabular-nums">
                  {upcomingTasks.length}
                </div>
                <p className="text-xs leading-4 text-muted-foreground">Do 7 dní</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content - Single Column */}
      <div className="w-full">
        {/* Tasks section - show if dashboard permission allows it */}
        {false && dashboardPermissions.show_tasks_section && (
          <div className="w-full">
            <Card>
              <CardContent className="p-0">
                <div>
                  {/* Tasks Section */}
                  <div>
                    <div className="border-b border-border px-4 py-4 sm:px-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <List className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h2 className="text-sm font-semibold text-foreground">Moje úlohy</h2>
                              {filteredTasks.length > 0 && (
                                <Badge variant="secondary" className="tabular-nums">
                                  {filteredTasks.length}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Prehľad vašej agendy na dnes
                            </p>
                          </div>
                        </div>
                        {/* Zoznam / Kalendár prepínač */}
                        <Tabs
                          value={viewMode}
                          onValueChange={(value) => {
                            const newViewMode = value as ViewMode;
                            setViewMode(newViewMode);
                            // When switching to calendar view, set activeTab to "all_active"
                            if (newViewMode === "calendar") {
                              setActiveTab("all_active");
                            }
                          }}
                          className="w-auto"
                        >
                          <TabsList>
                            <TabsTrigger value="list">
                              <List className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Zoznam</span>
                            </TabsTrigger>
                            <TabsTrigger value="calendar">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Kalendár</span>
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </div>
                    {/* Dashboard Tabs - only show in list view */}
                    {viewMode === "list" && (
                      <div className="border-b border-border/70 px-4 py-3 sm:px-5">
                        {/* Mobile: Select Dropdown */}
                        <div className="lg:hidden">
                          <Select
                            value={activeTab}
                            onValueChange={(value) => setActiveTab(value as DashboardTabType)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {(() => {
                                  const Icon = getTabIcon(activeTab);
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      <span>{getTabLabel(activeTab)}</span>
                                      {taskCounts[activeTab] > 0 && (
                                        <Badge
                                          variant="secondary"
                                          className="ml-auto h-5 px-1.5 text-xs bg-gray-200 text-gray-700"
                                        >
                                          {taskCounts[activeTab]}
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {availableTabs.map((tab) => {
                                const Icon = getTabIcon(tab);
                                return (
                                  <SelectItem key={tab} value={tab}>
                                    <div className="flex items-center gap-2 w-full">
                                      <Icon className="h-4 w-4" />
                                      <span>{getTabLabel(tab)}</span>
                                      {taskCounts[tab] > 0 && (
                                        <Badge
                                          variant="secondary"
                                          className="ml-auto h-5 px-1.5 text-xs bg-gray-200 text-gray-700"
                                        >
                                          {taskCounts[tab]}
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Desktop: Tabs */}
                        <Tabs
                          value={activeTab}
                          onValueChange={(value) => setActiveTab(value as DashboardTabType)}
                          className="w-full hidden lg:block"
                        >
                          <div className="overflow-x-auto scrollbar-hide">
                            <TabsList className="min-w-max">
                              {availableTabs.map((tab) => {
                                const Icon = getTabIcon(tab);
                                return (
                                  <TabsTrigger key={tab} value={tab} className="gap-1.5">
                                    <Icon className="h-3.5 w-3.5" />
                                    <span>{getTabLabel(tab)}</span>
                                    {taskCounts[tab] > 0 && (
                                      <Badge
                                        variant="secondary"
                                        className="ml-1 h-4 px-1 text-[10px] tabular-nums"
                                      >
                                        {taskCounts[tab]}
                                      </Badge>
                                    )}
                                  </TabsTrigger>
                                );
                              })}
                            </TabsList>
                          </div>
                        </Tabs>
                      </div>
                    )}

                    {/* Conditional rendering based on view mode */}
                    {viewMode === "list" ? (
                      <>
                        {filteredTasks.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium text-foreground">
                              {tasks.length === 0
                                ? "Nemáte priradené úlohy"
                                : "Žiadne úlohy v tejto kategórii"}
                            </p>
                            <p className="text-sm mt-2 text-muted-foreground">
                              {tasks.length === 0
                                ? "Začnite vytvorením nového projektu"
                                : "Skúste vybrať inú kategóriu"}
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/25 hover:bg-muted/25">
                                  <TableHead className="pl-5">Klient / Úloha</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Priradené</TableHead>
                                  <TableHead>Priorita</TableHead>
                                  <TableHead>Budget / Realita</TableHead>
                                  <TableHead>Deadline</TableHead>
                                  <TableHead className="w-[40px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredTasks.map((task) => {
                                  const statusInfo =
                                    statusConfig[task.status as keyof typeof statusConfig] ||
                                    statusConfig.todo;
                                  const priorityInfo =
                                    priorityConfig[task.priority as keyof typeof priorityConfig] ||
                                    priorityConfig.medium;
                                  const StatusIcon = statusInfo.icon;
                                  const PriorityIcon = priorityInfo.icon;
                                  const deadlineStatus = getDeadlineStatus(task.due_date);
                                  const taskColor = normalizeTaskColor(task.color);
                                  const rowStyle = taskColor
                                    ? {
                                        boxShadow: `inset 3px 0 0 ${taskColor}`,
                                        backgroundImage: `linear-gradient(90deg, ${taskColorToRgba(taskColor, 0.08)} 0, transparent 160px)`,
                                      }
                                    : undefined;

                                  return (
                                    <TableRow
                                      key={task.id}
                                      className="group cursor-pointer"
                                      style={rowStyle}
                                      onClick={() => {
                                        if (task.project?.id) {
                                          window.location.href = `/projects/${task.project.id}/tasks/${task.id}`;
                                        } else {
                                          window.location.href = `/tasks/${task.id}`;
                                        }
                                      }}
                                    >
                                      <TableCell className="py-4 pl-6 pr-2">
                                        <div className="min-w-0 space-y-1">
                                          {/* Project name and code - first line (uppercase, smaller) */}
                                          {task.project && (
                                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider leading-none">
                                              <span className="font-bold text-muted-foreground">
                                                {task.project.name}
                                              </span>
                                              <span className="font-bold text-muted-foreground/50">
                                                •
                                              </span>
                                              {task.project.code && (
                                                <span className="font-medium text-muted-foreground">
                                                  {task.project.code}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          {/* Task title - second line (larger, bold) */}
                                          <div className="flex items-center gap-2 min-w-0">
                                            {taskColor && (
                                              <span
                                                className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/5"
                                                style={{ backgroundColor: taskColor }}
                                                aria-label={`Farba úlohy ${taskColor}`}
                                              />
                                            )}
                                            <h3
                                              className="font-bold truncate text-sm leading-5 text-foreground"
                                              title={stripHtml(task.title)}
                                            >
                                              {truncateTaskTitle(task.title, 50)}
                                            </h3>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-4 pl-6 pr-2">
                                        <div onClick={(e) => e.stopPropagation()}>
                                          <StatusSelect
                                            status={
                                              task.status as
                                                | "todo"
                                                | "in_progress"
                                                | "review"
                                                | "sent_to_client"
                                                | "done"
                                                | "cancelled"
                                            }
                                            onStatusChange={(newStatus) =>
                                              handleUpdateTask(task.id, { status: newStatus })
                                            }
                                            disabled={!canUpdateTasks}
                                          />
                                        </div>
                                      </TableCell>
                                      <TableCell
                                        className="py-4 pl-6 pr-2"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <DashboardAssigneeCell
                                          task={task}
                                          onTaskUpdate={handleUpdateTask}
                                        />
                                      </TableCell>
                                      <TableCell className="py-4 pl-6 pr-2">
                                        <div onClick={(e) => e.stopPropagation()}>
                                          <PrioritySelect
                                            priority={
                                              task.priority as "low" | "medium" | "high" | "urgent"
                                            }
                                            onPriorityChange={(newPriority) =>
                                              handleUpdateTask(task.id, { priority: newPriority })
                                            }
                                            disabled={!canUpdateTasks}
                                          />
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-4 pl-6 pr-2 w-fit">
                                        {(() => {
                                          const actualHours = task.actual_hours || 0;
                                          const estimatedHours = task.estimated_hours || 0;

                                          // If both are 0, show nothing
                                          if (actualHours === 0 && estimatedHours === 0) {
                                            return (
                                              <span className="text-xs text-muted-foreground italic">
                                                —
                                              </span>
                                            );
                                          }

                                          // Calculate progress percentage
                                          const progress =
                                            estimatedHours > 0
                                              ? Math.min((actualHours / estimatedHours) * 100, 100)
                                              : 0;

                                          return (
                                            <div className="flex flex-col gap-1 w-[96px]">
                                              {/* Text row: actual hours (left, bold) + "/ estimated hours" (right, lighter) */}
                                              <div className="flex items-end justify-between w-full">
                                                <span className="text-[11px] font-bold leading-[11px] text-foreground dark:text-foreground">
                                                  {formatHours(actualHours)}
                                                </span>
                                                {estimatedHours > 0 && (
                                                  <span className="text-[10px] font-normal leading-[10px] text-muted-foreground dark:text-muted-foreground">
                                                    / {formatHours(estimatedHours)}
                                                  </span>
                                                )}
                                              </div>

                                              {/* Progress bar */}
                                              {estimatedHours > 0 && (
                                                <div className="h-1.5 w-full rounded-full bg-muted dark:bg-slate-800 overflow-hidden">
                                                  <div
                                                    className="h-full rounded-full bg-orange-400 dark:bg-orange-500 transition-all"
                                                    style={{ width: `${progress}%` }}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </TableCell>
                                      <TableCell className="py-4 pl-6 pr-2 w-fit">
                                        <div>
                                          {task.due_date ? (
                                            <div className="text-xs flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                                              <CalendarIcon className="h-3 w-3" />
                                              <span>
                                                {format(new Date(task.due_date), "dd.MM.yyyy", {
                                                  locale: sk,
                                                })}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-muted-foreground italic">
                                              —
                                            </span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <div className="flex justify-center">
                                          <div className="p-1 rounded group-hover:bg-muted">
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
                            {calendarView === "month"
                              ? format(new Date(calendarYear, calendarMonth, 1), "LLLL yyyy", {
                                  locale: sk,
                                }).replace(/^[a-z]/, (c) => c.toUpperCase())
                              : (() => {
                                  const normalizedDate = new Date(calendarDate);
                                  normalizedDate.setHours(0, 0, 0, 0);
                                  const weekStart = startOfWeek(normalizedDate, {
                                    locale: sk,
                                    weekStartsOn: 1,
                                  });
                                  const weekEnd = addDays(weekStart, 6);
                                  if (weekStart.getMonth() === weekEnd.getMonth()) {
                                    return (
                                      format(weekStart, "d.", { locale: sk }) +
                                      " - " +
                                      format(weekEnd, "d. LLLL yyyy", { locale: sk }).replace(
                                        /^[a-z]/,
                                        (c) => c.toUpperCase()
                                      )
                                    );
                                  } else {
                                    return (
                                      format(weekStart, "d. LLLL", { locale: sk }).replace(
                                        /^[a-z]/,
                                        (c) => c.toUpperCase()
                                      ) +
                                      " - " +
                                      format(weekEnd, "d. LLLL yyyy", { locale: sk }).replace(
                                        /^[a-z]/,
                                        (c) => c.toUpperCase()
                                      )
                                    );
                                  }
                                })()}
                          </h2>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Select
                                value={selectedUserId || "all"}
                                onValueChange={(value) =>
                                  setSelectedUserId(value === "all" ? null : value)
                                }
                              >
                                <SelectTrigger className="w-[180px] h-9">
                                  <SelectValue placeholder="Všetci používatelia" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Všetci používatelia</SelectItem>
                                  {workspaceUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name || user.email}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={calendarView}
                                onValueChange={(value: "week" | "month") => {
                                  if (value === "week") {
                                    if (calendarView === "month") {
                                      // Switch from month to week - always use today's date
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      setCalendarDate(today);
                                      setCalendarMonth(today.getMonth());
                                      setCalendarYear(today.getFullYear());
                                    }
                                    setCalendarView("week");
                                  } else {
                                    if (calendarView === "week") {
                                      // Switch from week to month - use first day of current week's month
                                      setCalendarMonth(calendarDate.getMonth());
                                      setCalendarYear(calendarDate.getFullYear());
                                    }
                                    setCalendarView("month");
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[120px] h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="week">Týždeň</SelectItem>
                                  <SelectItem value="month">Mesiac</SelectItem>
                                </SelectContent>
                              </Select>
                              <button
                                onClick={() => handleNavigate("prev")}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                                aria-label="Predchádzajúci"
                              >
                                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => handleNavigate("next")}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                                aria-label="Ďalší"
                              >
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                              </button>
                            </div>
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
                      min-height: 170px;
                      background: transparent;
                      transition: background 0.15s ease;
                      padding-bottom: 20px;
                      padding-top: 0 !important;
                    }
                    .rbc-day-bg .rbc-date-cell {
                      margin-bottom: 2px !important;
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
                      padding-bottom: 0 !important;
                    }
                    .rbc-month-view {
                      padding-bottom: 0 !important;
                    }
                    .rbc-day-bg.rbc-today {
                      background-color: rgba(var(--primary-rgb), 0.04);
                    }
                    .dark .rbc-day-bg.rbc-today {
                      background-color: rgba(59, 130, 246, 0.15);
                    }
                    .rbc-date-cell {
                      padding: 12px 8px 0px 12px !important;
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
                      border: none !important;
                      border-radius: 6px !important;
                      padding: 2px 8px !important;
                      font-size: 13px !important;
                      font-weight: 500 !important;
                      margin: 2px 1px !important;
                      margin-top: 2px !important;
                      cursor: pointer !important;
                      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
                      overflow: hidden !important;
                      text-overflow: ellipsis !important;
                      white-space: nowrap !important;
                      line-height: 1.4 !important;
                      height: auto !important;
                      min-height: 20px !important;
                      display: block !important;
                      visibility: visible !important;
                      opacity: 1 !important;
                      position: relative !important;
                    }
                    .rbc-event-content,
                    .rbc-event-label {
                      border: none !important;
                      border-radius: 2px !important;
                      padding: 0 !important;
                      font-size: 13px !important;
                      font-weight: 500 !important;
                      margin: 0 !important;
                      cursor: pointer !important;
                      overflow: hidden !important;
                      text-overflow: ellipsis !important;
                      white-space: nowrap !important;
                      line-height: 1.4 !important;
                      height: auto !important;
                      display: block !important;
                      visibility: visible !important;
                      opacity: 1 !important;
                    }
                    .rbc-event:hover {
                      opacity: 0.85 !important;
                      transform: translateY(-1px);
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
                    }
                    /* Force style for +XY more button - blue link style */
                    #calendar-container .rbc-show-more,
                    #calendar-container .rbc-button-link.rbc-show-more,
                    #calendar-container .rbc-calendar .rbc-show-more,
                    #calendar-container .rbc-calendar .rbc-button-link.rbc-show-more,
                    #calendar-container .rbc-calendar .rbc-event-more,
                    .rbc-calendar .rbc-month-view .rbc-show-more,
                    .rbc-calendar .rbc-month-view .rbc-button-link.rbc-show-more,
                    .rbc-calendar .rbc-month-view .rbc-event-more,
                    .rbc-calendar .rbc-day-bg .rbc-show-more,
                    .rbc-calendar .rbc-day-bg .rbc-button-link.rbc-show-more,
                    .rbc-calendar .rbc-day-bg .rbc-event-more,
                    div.rbc-calendar button.rbc-show-more,
                    div.rbc-calendar button.rbc-button-link.rbc-show-more,
                    div.rbc-calendar div.rbc-event-more {
                      border: none !important;
                      border-radius: 6px !important;
                      padding: 6px 10px !important;
                      font-size: 12px !important;
                      font-weight: 500 !important;
                      margin: 2px 1px !important;
                      margin-top: 2px !important;
                      cursor: pointer !important;
                      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
                      overflow: hidden !important;
                      text-overflow: ellipsis !important;
                      white-space: nowrap !important;
                      line-height: 1.4 !important;
                      height: auto !important;
                      min-height: 24px !important;
                      position: relative !important;
                      top: -2px !important;
                      color: rgb(37, 99, 235) !important;
                      background: transparent !important;
                      display: inline-flex !important;
                      align-items: center !important;
                      justify-content: center !important;
                      box-shadow: none !important;
                      text-decoration: underline !important;
                      text-underline-offset: 2px !important;
                    }
                    #calendar-container .rbc-show-more:hover,
                    #calendar-container .rbc-button-link.rbc-show-more:hover,
                    #calendar-container .rbc-calendar .rbc-show-more:hover,
                    #calendar-container .rbc-calendar .rbc-button-link.rbc-show-more:hover,
                    #calendar-container .rbc-calendar .rbc-event-more:hover,
                    .rbc-calendar .rbc-month-view .rbc-show-more:hover,
                    .rbc-calendar .rbc-month-view .rbc-button-link.rbc-show-more:hover,
                    .rbc-calendar .rbc-month-view .rbc-event-more:hover,
                    .rbc-calendar .rbc-day-bg .rbc-show-more:hover,
                    .rbc-calendar .rbc-day-bg .rbc-button-link.rbc-show-more:hover,
                    .rbc-calendar .rbc-day-bg .rbc-event-more:hover,
                    div.rbc-calendar button.rbc-show-more:hover,
                    div.rbc-calendar button.rbc-button-link.rbc-show-more:hover,
                    div.rbc-calendar div.rbc-event-more:hover {
                      color: rgb(59, 130, 246) !important;
                      background: transparent !important;
                      text-decoration: underline !important;
                      text-underline-offset: 2px !important;
                    }
                    .dark #calendar-container .rbc-show-more,
                    .dark #calendar-container .rbc-button-link.rbc-show-more,
                    .dark #calendar-container .rbc-calendar .rbc-show-more,
                    .dark #calendar-container .rbc-calendar .rbc-button-link.rbc-show-more,
                    .dark .rbc-calendar .rbc-month-view .rbc-show-more,
                    .dark .rbc-calendar .rbc-month-view .rbc-button-link.rbc-show-more,
                    .dark .rbc-calendar .rbc-day-bg .rbc-show-more,
                    .dark .rbc-calendar .rbc-day-bg .rbc-button-link.rbc-show-more {
                      color: rgb(96, 165, 250) !important;
                      background: transparent !important;
                    }
                    .dark #calendar-container .rbc-show-more:hover,
                    .dark #calendar-container .rbc-button-link.rbc-show-more:hover,
                    .dark #calendar-container .rbc-calendar .rbc-show-more:hover,
                    .dark #calendar-container .rbc-calendar .rbc-button-link.rbc-show-more:hover,
                    .dark .rbc-calendar .rbc-month-view .rbc-show-more:hover,
                    .dark .rbc-calendar .rbc-month-view .rbc-button-link.rbc-show-more:hover,
                    .dark .rbc-calendar .rbc-day-bg .rbc-show-more:hover,
                    .dark .rbc-calendar .rbc-day-bg .rbc-button-link.rbc-show-more:hover {
                      color: rgb(147, 197, 253) !important;
                      background: transparent !important;
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
                    /* Week view styles */
                    .rbc-time-view {
                      border: none;
                    }
                    .rbc-time-header {
                      border-bottom: 1px solid hsl(var(--border));
                    }
                    .rbc-time-header-content {
                      border-left: none;
                    }
                    .rbc-time-content {
                      border-top: 1px solid hsl(var(--border));
                    }
                    .rbc-time-slot {
                      border-top: 1px solid rgba(0, 0, 0, 0.04);
                    }
                    .dark .rbc-time-slot {
                      border-top: 1px solid hsl(var(--border));
                    }
                    .rbc-day-slot {
                      border-right: 1px solid rgba(0, 0, 0, 0.04);
                    }
                    .dark .rbc-day-slot {
                      border-right: 1px solid hsl(var(--border));
                    }
                    .rbc-day-slot:last-child {
                      border-right: none;
                    }
                    .rbc-time-header-gutter {
                      border-right: 1px solid hsl(var(--border));
                    }
                    .rbc-time-gutter {
                      border-right: 1px solid hsl(var(--border));
                    }
                    .rbc-time-gutter .rbc-time-slot {
                      border-right: none;
                    }
                    .rbc-time-slot .rbc-label {
                      padding: 0 8px;
                      font-size: 11px;
                      color: rgb(107, 114, 128);
                      text-align: right;
                    }
                    .dark .rbc-time-slot .rbc-label {
                      color: rgb(156, 163, 175);
                    }
                    .rbc-allday-cell {
                      border-bottom: 1px solid hsl(var(--border));
                    }
                    .rbc-allday-cell .rbc-day-bg {
                      border-right: 1px solid rgba(0, 0, 0, 0.04);
                      min-height: 40px;
                    }
                    .dark .rbc-allday-cell .rbc-day-bg {
                      border-right: 1px solid hsl(var(--border));
                    }
                    .rbc-week-view .rbc-day-bg {
                      min-height: 120px;
                    }
                  `}</style>
                        <div id="calendar-container" className="h-full">
                          {calendarView === "week" ? (
                            <WeekCalendar
                              date={calendarDate}
                              tasks={calendarTasks.filter((task) => task.due_date)}
                              onTaskClick={(task) => {
                                if (task.project?.id) {
                                  window.location.href = `/projects/${task.project.id}/tasks/${task.id}`;
                                } else {
                                  window.location.href = `/tasks/${task.id}`;
                                }
                              }}
                            />
                          ) : typeof window !== "undefined" && localizer ? (
                            <Calendar
                              key={`calendar-${selectedUserId || "all"}-${calendarTasks.length}`}
                              localizer={localizer}
                              events={calendarTasks
                                .filter((task) => task.due_date)
                                .flatMap((task) => {
                                  // Use start_date if available, otherwise use due_date
                                  const startDate = task.start_date
                                    ? new Date(task.start_date + "T00:00:00")
                                    : new Date(task.due_date + "T00:00:00");

                                  // Use end_date if available, otherwise use due_date
                                  const endDate = task.end_date
                                    ? new Date(task.end_date + "T00:00:00")
                                    : new Date(task.due_date + "T00:00:00");

                                  // Create a separate event for each day
                                  const events = [];
                                  const currentDate = new Date(startDate);

                                  // Iterate through each day from start to end (inclusive)
                                  while (currentDate <= endDate) {
                                    const dayStart = new Date(currentDate);
                                    dayStart.setHours(0, 0, 0, 0);
                                    const dayEnd = addDays(dayStart, 1); // Start of next day

                                    events.push({
                                      id: `${task.id}-${dayStart.toISOString().split("T")[0]}`,
                                      title: stripHtml(task.title),
                                      start: dayStart,
                                      end: dayEnd,
                                      allDay: true,
                                      resource: task,
                                    });

                                    // Move to next day
                                    currentDate.setDate(currentDate.getDate() + 1);
                                  }

                                  return events;
                                })}
                              views={["month"]}
                              view="month"
                              culture="sk"
                              toolbar={false}
                              date={new Date(calendarYear, calendarMonth, 1)}
                              onNavigate={(date: Date) => {
                                setCalendarMonth(date.getMonth());
                                setCalendarYear(date.getFullYear());
                              }}
                              onSelectEvent={(event: any) => {
                                if (event.resource.project?.id) {
                                  window.location.href = `/projects/${event.resource.project.id}/tasks/${event.resource.id}`;
                                } else {
                                  window.location.href = `/tasks/${event.resource.id}`;
                                }
                              }}
                              eventPropGetter={(event: any) => {
                                // Check if dark mode is active
                                const isDarkMode =
                                  document.documentElement.classList.contains("dark");
                                const taskColor = normalizeTaskColor(event.resource?.color);

                                if (taskColor) {
                                  return {
                                    style: {
                                      backgroundColor: isDarkMode
                                        ? taskColorToRgba(taskColor, 0.22)
                                        : taskColorToRgba(taskColor, 0.12),
                                      color: isDarkMode ? "#f1f5f9" : "#0f172a",
                                      border: `1px solid ${taskColorToRgba(taskColor, isDarkMode ? 0.45 : 0.3)}`,
                                      borderLeft: `3px solid ${taskColor}`,
                                      borderRadius: "6px",
                                      padding: "2px 8px",
                                      fontSize: "13px",
                                      fontWeight: "500",
                                    },
                                  };
                                }

                                // Generate consistent color based on task ID hash - soft tints with base color text
                                const colorSchemes = isDarkMode
                                  ? [
                                      { bg: "rgba(30, 64, 175, 0.15)", text: "#93c5fd" }, // soft blue tint (dark mode)
                                      { bg: "rgba(6, 95, 70, 0.15)", text: "#6ee7b7" }, // soft emerald tint (dark mode)
                                      { bg: "rgba(146, 64, 14, 0.15)", text: "#fbbf24" }, // soft amber tint (dark mode)
                                      { bg: "rgba(91, 33, 182, 0.15)", text: "#c4b5fd" }, // soft purple tint (dark mode)
                                      { bg: "rgba(159, 18, 57, 0.15)", text: "#f9a8d4" }, // soft pink tint (dark mode)
                                      { bg: "rgba(14, 116, 144, 0.15)", text: "#67e8f9" }, // soft cyan tint (dark mode)
                                      { bg: "rgba(55, 48, 163, 0.15)", text: "#a5b4fc" }, // soft indigo tint (dark mode)
                                      { bg: "rgba(19, 78, 74, 0.15)", text: "#5eead4" }, // soft teal tint (dark mode)
                                      { bg: "rgba(154, 52, 18, 0.15)", text: "#fb923c" }, // soft orange tint (dark mode)
                                      { bg: "rgba(107, 33, 168, 0.15)", text: "#c084fc" }, // soft violet tint (dark mode)
                                    ]
                                  : [
                                      { bg: "#dbeafe", text: "#1e40af" }, // soft blue tint, dark blue text
                                      { bg: "#d1fae5", text: "#065f46" }, // soft emerald tint, dark emerald text
                                      { bg: "#fef3c7", text: "#92400e" }, // soft amber tint, dark amber text
                                      { bg: "#e9d5ff", text: "#5b21b6" }, // soft purple tint, dark purple text
                                      { bg: "#fce7f3", text: "#9f1239" }, // soft pink tint, dark pink text
                                      { bg: "#cffafe", text: "#0e7490" }, // soft cyan tint, dark cyan text
                                      { bg: "#e0e7ff", text: "#3730a3" }, // soft indigo tint, dark indigo text
                                      { bg: "#ccfbf1", text: "#134e4a" }, // soft teal tint, dark teal text
                                      { bg: "#fed7aa", text: "#9a3412" }, // soft orange tint, dark orange text
                                      { bg: "#f3e8ff", text: "#6b21a8" }, // soft violet tint, dark violet text
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
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "2px 8px",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                  },
                                };
                              }}
                              components={{
                                month: {
                                  header: ({ date }: any) => (
                                    <div className="px-3 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                                      {format(date, "EEE", { locale: sk })}
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
                                event: ({ event }: any) => {
                                  return (
                                    <div
                                      onClick={() => {
                                        if (event.resource?.project?.id) {
                                          window.location.href = `/projects/${event.resource.project.id}/tasks/${event.resource.id}`;
                                        } else {
                                          window.location.href = `/tasks/${event.resource?.id}`;
                                        }
                                      }}
                                      className="cursor-pointer"
                                    >
                                      {event.title}
                                    </div>
                                  );
                                },
                                agenda: {
                                  event: ({ event }: any) => <div>{event.title}</div>,
                                },
                              }}
                              onShowMore={(events: any[], date: Date) => {
                                handleMoreEventsClick(events, date);
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Quick Task Dialog */}
      <TaskDialog
        projectId={null}
        open={isQuickTaskOpen}
        onOpenChange={setIsQuickTaskOpen}
        onSuccess={() => {
          // Refresh tasks
          const fetchData = async () => {
            try {
              const [assignedTasksResponse, allActiveTasksResponse, unassignedTasksResponse] =
                await Promise.all([
                  fetch(
                    `/api/dashboard/assigned-tasks?workspace_id=${workspace?.id}&show_unassigned=false&show_all=false`
                  ),
                  fetch(
                    `/api/dashboard/assigned-tasks?workspace_id=${workspace?.id}&show_unassigned=false&show_all=true`
                  ),
                  fetch(
                    `/api/dashboard/assigned-tasks?workspace_id=${workspace?.id}&show_unassigned=true`
                  ),
                ]);

              const assignedTasksResult = await assignedTasksResponse.json();
              const allActiveTasksResult = await allActiveTasksResponse.json();
              const unassignedTasksResult = await unassignedTasksResponse.json();

              if (assignedTasksResult.success) {
                setTasks(assignedTasksResult.data);
              }
              if (allActiveTasksResult.success) {
                setAllActiveTasks(allActiveTasksResult.data);
              }
              if (unassignedTasksResult.success) {
                setUnassignedTasks(unassignedTasksResult.data);
              }
            } catch (error) {
              console.error("Error refreshing data:", error);
            }
          };
          fetchData();
        }}
      />

      {/* More Events Modal */}
      <Dialog open={moreEventsModalOpen} onOpenChange={setMoreEventsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {moreEventsDate &&
                format(moreEventsDate, "EEEE, d. MMMM yyyy", { locale: sk }).replace(
                  /^[a-z]/,
                  (c) => c.toUpperCase()
                )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {moreEventsTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Žiadne úlohy na tento deň
              </div>
            ) : (
              moreEventsTasks.map((task) => {
                const isDarkMode =
                  typeof window !== "undefined" &&
                  document.documentElement.classList.contains("dark");
                const colorSchemes = isDarkMode
                  ? [
                      { bg: "rgba(30, 64, 175, 0.15)", text: "#93c5fd" },
                      { bg: "rgba(6, 95, 70, 0.15)", text: "#6ee7b7" },
                      { bg: "rgba(146, 64, 14, 0.15)", text: "#fbbf24" },
                      { bg: "rgba(91, 33, 182, 0.15)", text: "#c4b5fd" },
                      { bg: "rgba(159, 18, 57, 0.15)", text: "#f9a8d4" },
                      { bg: "rgba(14, 116, 144, 0.15)", text: "#67e8f9" },
                      { bg: "rgba(55, 48, 163, 0.15)", text: "#a5b4fc" },
                      { bg: "rgba(19, 78, 74, 0.15)", text: "#5eead4" },
                      { bg: "rgba(154, 52, 18, 0.15)", text: "#fb923c" },
                      { bg: "rgba(107, 33, 168, 0.15)", text: "#c084fc" },
                    ]
                  : [
                      { bg: "#dbeafe", text: "#1e40af" },
                      { bg: "#d1fae5", text: "#065f46" },
                      { bg: "#fef3c7", text: "#92400e" },
                      { bg: "#e9d5ff", text: "#5b21b6" },
                      { bg: "#fce7f3", text: "#9f1239" },
                      { bg: "#cffafe", text: "#0e7490" },
                      { bg: "#e0e7ff", text: "#3730a3" },
                      { bg: "#ccfbf1", text: "#134e4a" },
                      { bg: "#fed7aa", text: "#9a3412" },
                      { bg: "#f3e8ff", text: "#6b21a8" },
                    ];

                let hash = 0;
                for (let i = 0; i < task.id.length; i++) {
                  hash = task.id.charCodeAt(i) + ((hash << 5) - hash);
                }
                const colorIndex = Math.abs(hash) % colorSchemes.length;
                const colorScheme = colorSchemes[colorIndex];

                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setMoreEventsModalOpen(false);
                      // Ensure projectId is not empty
                      const projectId =
                        task.project?.id && task.project.id.trim() !== ""
                          ? task.project.id
                          : task.project_id && task.project_id.trim() !== ""
                            ? task.project_id
                            : "unknown";
                      window.location.href = `/projects/${projectId}/tasks/${task.id}`;
                    }}
                    className={cn(
                      "px-4 py-3 rounded-lg cursor-pointer transition-all hover:shadow-md flex flex-col gap-1"
                    )}
                    style={{
                      backgroundColor: colorScheme.bg,
                      color: colorScheme.text,
                    }}
                  >
                    <div className="font-semibold text-sm">{stripHtml(task.title)}</div>
                    {task.project && (
                      <div className="text-xs opacity-75">
                        {task.project?.code || task.project?.name || "Bez projektu"}
                      </div>
                    )}
                    {task.description && (
                      <div className="text-xs opacity-70 mt-1 line-clamp-2">
                        {stripHtml(task.description)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
