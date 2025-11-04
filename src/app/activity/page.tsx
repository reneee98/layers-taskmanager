"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Activity, Zap, FolderKanban, Clock, Edit, Plus, CheckCircle2, MessageSquare, FolderPlus, FolderOpen, Building2, Building, UserPlus, Upload, Search, Calendar as CalendarIcon, X } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  };
  return icons[type] || Activity;
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

      {/* Activities Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="w-[50px] text-muted-foreground font-semibold"></TableHead>
              <TableHead className="text-muted-foreground font-semibold">Používateľ</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Akcia</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Projekt</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Dátum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                  <p>Načítavam aktivity...</p>
                </TableCell>
              </TableRow>
            ) : filteredActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Zap className="h-12 w-12 opacity-50" />
                    <p className="text-lg font-medium">
                      {hasActiveFilters ? "Žiadne aktivity podľa filtrov" : "Žiadna aktivita"}
                    </p>
                    <p className="text-sm">
                      {hasActiveFilters ? "Skúste zmeniť filtre" : "Začnite pracovať na úlohách"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredActivities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <TableRow
                    key={activity.id}
                    onClick={() => handleActivityClick(activity)}
                    className={cn(
                      "hover:bg-muted transition-colors",
                      activity.task_id && activity.project_id ? "cursor-pointer" : ""
                    )}
                    title={activity.task_id && activity.project_id ? "Kliknite pre zobrazenie detailu úlohy" : ""}
                  >
                    <TableCell>
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={activity.user_avatar_url || undefined} alt={activity.user} />
                          <AvatarFallback className="text-xs font-semibold bg-muted">
                            {getInitials(activity.user_name || activity.user, activity.user_email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full border-2 border-background bg-black"
                        )}>
                          <Icon className="h-2 w-2 text-white" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {activity.user || 'Neznámy používateľ'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-foreground">
                          <span className="font-medium">{activity.action}</span>
                          {activity.details && <span className="ml-1 text-muted-foreground">{activity.details}</span>}
                        </span>
                        {activity.description && (
                          <span className="text-xs text-muted-foreground italic line-clamp-1">
                            {activity.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {activity.project ? (
                        <div className="flex items-center gap-1.5">
                          <FolderKanban className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {activity.project} {activity.project_code && `(${activity.project_code})`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(activity.created_at), 'dd.MM.yyyy HH:mm', { locale: sk })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Load More Button */}
        {hasMore && !loading && activities.length > 0 && !hasActiveFilters && (
          <div className="p-4 border-t border-border">
            <Button
              variant="outline"
              onClick={loadMore}
              className="w-full"
              disabled={loading}
            >
              {loading ? "Načítavam..." : "Načítať viac"}
            </Button>
          </div>
        )}

        {loading && activities.length > 0 && (
          <div className="p-4 border-t border-border text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-4 border-primary border-t-transparent mx-auto"></div>
          </div>
        )}
      </div>
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

