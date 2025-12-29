"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { 
  Activity, 
  Zap, 
  FolderKanban, 
  Clock, 
  Edit, 
  Plus, 
  CheckCircle2, 
  MessageSquare, 
  FolderPlus, 
  FolderOpen, 
  Building2, 
  Building, 
  UserPlus, 
  Upload, 
  Search, 
  Calendar as CalendarIcon, 
  X,
  MoreVertical,
  RefreshCw,
  AlertCircle,
  FileText,
  Activity as ActivityIcon,
  Circle,
  Play,
  Eye,
  Send,
  XCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Flame,
  Flag
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatTextWithTaskStatusLabels } from "@/lib/task-status";
import { useMemo } from "react";

interface ActivityData {
  id: string;
  type: string;
  action: string;
  details: string;
  user: string;
  user_name?: string;
  user_email?: string;
  user_avatar_url?: string;
  created_at: string;
  project?: string;
  project_id?: string;
  project_code?: string;
  task_id?: string;
  task_title?: string;
  description?: string;
  metadata?: any;
}

const getActivityIcon = (type: string) => {
  const icons: Record<string, any> = {
    time_entry: Clock,
    task_update: Edit,
    task_created: Plus,
    task_completed: CheckCircle2,
    comment: MessageSquare,
    project_created: FolderPlus,
    project_updated: FolderOpen,
    client_created: Building2,
    client_updated: Building,
    member_added: UserPlus,
    file_upload: Upload,
    task_due_date_changed: Clock,
    task_priority_changed: AlertCircle,
    task_status_changed: RefreshCw,
  };
  return icons[type] || Activity;
};

// Get activity indicator (colored badge) based on activity type
const getStatusIndicator = (status?: string | null) => {
  switch (status) {
    case "todo":
      return { icon: Circle, bgColor: "bg-slate-500", iconColor: "text-white" };
    case "in_progress":
      return { icon: Play, bgColor: "bg-blue-600", iconColor: "text-white" };
    case "review":
      return { icon: Eye, bgColor: "bg-amber-500", iconColor: "text-white" };
    case "sent_to_client":
      return { icon: Send, bgColor: "bg-purple-600", iconColor: "text-white" };
    case "done":
      return { icon: CheckCircle2, bgColor: "bg-emerald-600", iconColor: "text-white" };
    case "cancelled":
      return { icon: XCircle, bgColor: "bg-red-600", iconColor: "text-white" };
    default:
      return null;
  }
};

const getPriorityIndicator = (priority?: string | null) => {
  switch (priority) {
    case "low":
      return { icon: ArrowDown, bgColor: "bg-emerald-600", iconColor: "text-white" };
    case "medium":
      return { icon: ArrowUp, bgColor: "bg-amber-500", iconColor: "text-white" };
    case "high":
      return { icon: ArrowUpRight, bgColor: "bg-orange-600", iconColor: "text-white" };
    case "urgent":
      return { icon: Flame, bgColor: "bg-red-600", iconColor: "text-white" };
    default:
      return null;
  }
};

const getActivityIndicator = (type: string, metadata?: any) => {
  if (type === "task_status_changed" || type.includes("status")) {
    const statusFromMetadata = metadata?.new_status || metadata?.status || metadata?.to_status || null;
    return (
      getStatusIndicator(statusFromMetadata) ?? {
        icon: RefreshCw,
        bgColor: "bg-[#fe9a00]",
        iconColor: "text-white",
      }
    );
  }

  if (type === "task_priority_changed" || type.includes("priority")) {
    const priorityFromMetadata = metadata?.new_priority || metadata?.priority || null;
    return (
      getPriorityIndicator(priorityFromMetadata) ?? {
        icon: Flag,
        bgColor: "bg-[#fb2c36]",
        iconColor: "text-white",
      }
    );
  }

  // Blue for deadline/date changes
  if (type.includes('due_date') || type.includes('date') || type === 'time_entry') {
    return {
      icon: Clock,
      bgColor: 'bg-[#2b7fff]',
      iconColor: 'text-white'
    };
  }
  // Default blue
  return {
    icon: ActivityIcon,
    bgColor: 'bg-[#2b7fff]',
    iconColor: 'text-white'
  };
};

const getInitials = (name?: string, email?: string) => {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "U";
};

type DateFilter = "all" | "today" | "week" | "month" | "custom";

function ActivityPageContent() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDate, setCustomDate] = useState<string | undefined>(undefined);
  const pageSize = 50;

  const fetchActivities = useCallback(async (pageNum: number = 1) => {
    if (!workspace?.id) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/dashboard/activity?workspace_id=${workspace.id}&page=${pageNum}&limit=${pageSize}`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Nepodarilo sa načítať aktivity");
      }

      const newActivities = result.data || [];
      
      if (pageNum === 1) {
        setActivities(newActivities);
      } else {
        setActivities((prev) => [...prev, ...newActivities]);
      }

      setHasMore(newActivities.length === pageSize);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchActivities(nextPage);
    }
  };

  const handleActivityClick = (activity: ActivityData) => {
    if (activity.task_id && activity.project_id) {
      window.location.href = `/projects/${activity.project_id}/tasks/${activity.task_id}`;
    }
  };

  // Filter activities based on search term and date filter
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (dateFilter) {
        case "today":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "week":
          startDate = startOfWeek(now, { locale: sk });
          endDate = endOfWeek(now, { locale: sk });
          break;
        case "month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "custom":
          if (customDate) {
            const selectedDate = new Date(customDate);
            startDate = startOfDay(selectedDate);
            endDate = endOfDay(selectedDate);
          } else {
            return filtered;
          }
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter((activity) => {
        const activityDate = new Date(activity.created_at);
        return isWithinInterval(activityDate, { start: startDate, end: endDate });
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((activity) => {
        return (
          activity.user?.toLowerCase().includes(searchLower) ||
          activity.action?.toLowerCase().includes(searchLower) ||
          activity.details?.toLowerCase().includes(searchLower) ||
          activity.project?.toLowerCase().includes(searchLower) ||
          activity.project_code?.toLowerCase().includes(searchLower) ||
          activity.description?.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [activities, searchTerm, dateFilter, customDate]);

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("all");
    setCustomDate(undefined);
  };

  const hasActiveFilters = searchTerm.trim() !== "" || 
    (dateFilter !== "all" && (dateFilter !== "custom" || customDate !== undefined));

  const handleDateFilterChange = (value: DateFilter) => {
    setDateFilter(value);
    if (value !== "custom") {
      setCustomDate(undefined);
    }
  };

  // Format activity description with project name inline
  const formatActivityDescription = (activity: ActivityData) => {
    const action = formatTextWithTaskStatusLabels(activity.action);
    const project = activity.project || '';
    
    if (project && action) {
      return `${action} ${project}`;
    }
    return action || activity.details || '';
  };

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aktivita</h1>
          <p className="text-muted-foreground mt-1">Celá história aktivít vo workspace</p>
        </div>
        {filteredActivities.length > 0 && (
          <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
            {filteredActivities.length} aktivít
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hľadať aktivity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={dateFilter} onValueChange={(value) => handleDateFilterChange(value as DateFilter)}>
          <SelectTrigger className="w-[180px] bg-card border-border">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky dátumy</SelectItem>
            <SelectItem value="today">Dnes</SelectItem>
            <SelectItem value="week">Tento týždeň</SelectItem>
            <SelectItem value="month">Tento mesiac</SelectItem>
            <SelectItem value="custom">Konkrétny deň</SelectItem>
          </SelectContent>
        </Select>
        {dateFilter === "custom" && (
          <div className="w-[200px]">
            <DatePicker
              value={customDate}
              onChange={(date) => setCustomDate(date)}
              placeholder="Vyberte dátum"
            />
          </div>
        )}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="h-9 px-3">
            <X className="h-4 w-4 mr-2" />
            Vyčistiť filtre
          </Button>
        )}
      </div>

      {/* Activity Card - Figma Design */}
      <Card className="bg-white/50 dark:bg-slate-900/50 border border-[#e2e8f0] dark:border-slate-700 rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        {/* Card Header */}
        <CardHeader className="border-b border-[#f1f5f9] dark:border-slate-700 pb-0 px-6 pt-0">
          <div className="flex items-center justify-between h-[89px] px-6 py-0">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="h-10 w-10 rounded-[14px] bg-[#0f172b] dark:bg-slate-800 shadow-[0px_10px_15px_-3px_#e2e8f0,0px_4px_6px_-4px_#e2e8f0] flex items-center justify-center flex-shrink-0">
                <ActivityIcon className="h-5 w-5 text-white" />
              </div>
              {/* Title and Subtitle */}
              <div className="flex flex-col">
                <h2 className="text-[18px] font-bold leading-[28px] text-[#0f172b] dark:text-foreground tracking-[-0.44px]">
                  Aktivita
                </h2>
                <p className="text-[12px] font-medium leading-[16px] text-[#62748e] dark:text-muted-foreground mt-0.5">
                  Posledné zmeny
                </p>
              </div>
            </div>
            {/* Menu Button */}
            <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </CardHeader>

        {/* Card Content - Timeline */}
        <CardContent className="pt-6 px-6 pb-0">
          {loading && activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
              <p>Načítavam aktivity...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 opacity-50 mb-4" />
              <p className="text-lg font-medium mb-1">
                {hasActiveFilters ? "Žiadne aktivity podľa filtrov" : "Žiadna aktivita"}
              </p>
              <p className="text-sm">
                {hasActiveFilters ? "Skúste zmeniť filtre" : "Začnite pracovať na úlohách"}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline Line - positioned at 16px from left */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[#e2e8f0] dark:bg-slate-700"></div>
              
              {/* Activity Items */}
              <div className="flex flex-col gap-8 pb-6">
                {filteredActivities.map((activity, index) => {
                  const indicator = getActivityIndicator(activity.type, activity.metadata);
                  const IndicatorIcon = indicator.icon;
                  const timeStr = format(new Date(activity.created_at), 'HH:mm', { locale: sk });
                  
                  return (
                    <div 
                      key={activity.id} 
                      className={cn(
                        "relative pl-12",
                        activity.task_id && activity.project_id ? "cursor-pointer" : ""
                      )}
                      onClick={() => handleActivityClick(activity)}
                      role={activity.task_id && activity.project_id ? "button" : undefined}
                      tabIndex={activity.task_id && activity.project_id ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && activity.task_id && activity.project_id) {
                          handleActivityClick(activity);
                        }
                      }}
                    >
                      {/* Timeline Dot - centered exactly on the line at left-4 (16px) */}
                      <div 
                        className="absolute top-[2px] h-2.5 w-2.5 rounded-full bg-[#cad5e2] dark:bg-slate-600 border-2 border-white dark:border-slate-900 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
                        style={{ 
                          left: '16px',
                          transform: 'translateX(-50%)',
                          boxSizing: 'border-box'
                        }}
                      ></div>
                      
                      {/* Activity Content */}
                      <div className="flex flex-col gap-1">
                        {/* User Name and Time */}
                        <div className="flex items-start justify-between">
                          <p className="text-[14px] font-bold leading-[20px] text-[#0f172b] dark:text-foreground tracking-[-0.15px]">
                            {activity.user_name || activity.user || 'Neznámy používateľ'}
                          </p>
                          <div className="h-[21px] px-2 rounded-full bg-[#f8fafc] dark:bg-slate-800 border border-[#f1f5f9] dark:border-slate-700 flex items-center">
                            <p className="text-[10px] font-medium leading-[15px] text-[#90a1b9] dark:text-slate-400 tracking-[0.12px]">
                              {timeStr}
                            </p>
                          </div>
                        </div>
                        
                        {/* Activity Description */}
                        <div className="flex items-start gap-1.5">
                          <p className="text-[14px] font-normal leading-[22.75px] text-[#45556c] dark:text-slate-300 tracking-[-0.15px]">
                            {formatActivityDescription(activity)}
                          </p>
                          {activity.project && (
                            <p className="text-[14px] font-semibold leading-[22.75px] text-[#1d293d] dark:text-foreground tracking-[-0.15px]">
                              {activity.project}
                            </p>
                          )}
                        </div>
                        
                        {/* Project Code and Indicator */}
                        <div className="flex items-center gap-3 mt-1">
                          {activity.project_code && (
                            <div className="h-[25px] px-2 rounded bg-[#f8fafc] dark:bg-slate-800 border border-[#f1f5f9] dark:border-slate-700 flex items-center gap-2">
                              <FileText className="h-2.5 w-2.5 text-[#62748e] dark:text-slate-400" />
                              <p className="text-[10px] font-medium leading-[15px] text-[#62748e] dark:text-slate-400 tracking-[0.12px]">
                                {activity.project_code}
                              </p>
                            </div>
                          )}
                          {/* Activity Indicator Badge */}
                          <div className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center",
                            indicator.bgColor
                          )}>
                            <IndicatorIcon className={cn("h-2.5 w-2.5", indicator.iconColor)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !loading && activities.length > 0 && !hasActiveFilters && (
            <div className="pt-6 pb-6 border-t border-[#cad5e2] dark:border-slate-700">
              <Button
                variant="outline"
                onClick={loadMore}
                className="w-full h-8 border border-[#cad5e2] dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 hover:bg-muted"
                disabled={loading}
              >
                <span className="text-[12px] font-medium leading-[16px] text-[#62748e] dark:text-slate-400">
                  {loading ? "Načítavam..." : "Zobraziť staršie aktivity"}
                </span>
              </Button>
            </div>
          )}

          {loading && activities.length > 0 && (
            <div className="pt-6 pb-6 border-t border-[#cad5e2] dark:border-slate-700 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-4 border-primary border-t-transparent mx-auto"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <AuthGuard>
      <ActivityPageContent />
    </AuthGuard>
  );
}
