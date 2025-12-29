"use client";

import { useState, useEffect, useMemo } from "react";
import { usePermission } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Activity, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatHours, formatCurrency } from "@/lib/format";
import { format, subDays, parseISO, startOfDay, isWithinInterval } from "date-fns";
import { sk } from "date-fns/locale";

interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  hours: number;
  date: string;
  description: string | null;
  hourly_rate: number;
  amount: number;
  is_billable: boolean;
  created_at: string;
  start_time?: string | null;
  end_time?: string | null;
  billing_type?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

interface TaskTimeTabProps {
  taskId: string;
  projectId: string;
  onTimeEntryAdded?: () => void;
}

// Avatar color palettes for different users
const AVATAR_COLORS = [
  { bg: "bg-[#dbeafe]", text: "text-[#155dfc]" }, // Blue - René M.
  { bg: "bg-[#d0fae5]", text: "text-[#096]" },    // Green - Viktor Beňo
  { bg: "bg-[#f3e8ff]", text: "text-[#9810fa]" }, // Purple - Jana K.
  { bg: "bg-[#fef3c7]", text: "text-[#d97706]" }, // Yellow
  { bg: "bg-[#fce7f3]", text: "text-[#db2777]" }, // Pink
  { bg: "bg-[#ccfbf1]", text: "text-[#0d9488]" }, // Teal
];

const getAvatarColor = (userId: string) => {
  // Generate a consistent color index based on user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const getInitials = (name: string | undefined) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getShortName = (name: string | undefined) => {
  if (!name) return "Neznámy";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return name;
};

// Day labels in Slovak
const DAY_LABELS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export function TaskTimeTab({ taskId, projectId, onTimeEntryAdded }: TaskTimeTabProps) {
  const { hasPermission: canViewHourlyRates } = usePermission('financial', 'view_hourly_rates');
  const { hasPermission: canViewPrices } = usePermission('financial', 'view_prices');
  const { hasPermission: canDeleteTimeEntries } = usePermission('time_entries', 'delete');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);

  // Fetch time entries for the task
  const fetchTimeEntries = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/time`);
      const result = await response.json();
      if (result.success && result.data) {
        // Sort by date descending (newest first)
        const sortedEntries = result.data.sort((a: TimeEntry, b: TimeEntry) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTimeEntries(sortedEntries);
      } else {
        setTimeEntries([]);
      }
    } catch (error) {
      console.error("Failed to fetch time entries:", error);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTimeEntries();
    }
  }, [taskId]);

  // Calculate totals
  const totalHours = useMemo(() => {
    return timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  }, [timeEntries]);

  const extraAmount = useMemo(() => {
    return timeEntries
      .filter(entry => entry.billing_type === 'extra' || entry.billing_type === 'tm')
      .reduce((sum, entry) => sum + entry.amount, 0);
  }, [timeEntries]);

  // User breakdown type for chart
  interface UserBreakdown {
    userId: string;
    userName: string;
    hours: number;
    amount: number;
    isExtra: boolean;
  }

  interface DayData {
    date: Date;
    hours: number;
    dayIndex: number;
    budgetHours: number;
    extraHours: number;
    userBreakdown: UserBreakdown[];
    entries: TimeEntry[];
  }

  // Calculate daily hours for chart (only days with worked hours) with user breakdown
  const dailyData = useMemo((): DayData[] => {
    const days: DayData[] = [];
    
    // Group time entries by date
    const entriesByDate = new Map<string, TimeEntry[]>();
    timeEntries.forEach(entry => {
      const dateKey = entry.date;
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, []);
      }
      entriesByDate.get(dateKey)!.push(entry);
    });
    
    // Process only days with entries
    entriesByDate.forEach((dayEntries, dateKey) => {
      const date = parseISO(dateKey);
      const dayStart = startOfDay(date);
      
      const dayHours = dayEntries.reduce((sum, entry) => sum + entry.hours, 0);
      
      // Only include days with hours > 0
      if (dayHours > 0) {
        const budgetHours = dayEntries
          .filter(e => e.billing_type !== 'extra' && e.billing_type !== 'tm')
          .reduce((sum, e) => sum + e.hours, 0);
        const extraHours = dayEntries
          .filter(e => e.billing_type === 'extra' || e.billing_type === 'tm')
          .reduce((sum, e) => sum + e.hours, 0);
        
        // Group by user
        const userMap = new Map<string, UserBreakdown>();
        dayEntries.forEach(entry => {
          const userId = entry.user_id;
          const existing = userMap.get(userId);
          const isExtra = entry.billing_type === 'extra' || entry.billing_type === 'tm';
          
          if (existing) {
            existing.hours += entry.hours;
            existing.amount += entry.amount;
            if (isExtra) existing.isExtra = true;
          } else {
            userMap.set(userId, {
              userId,
              userName: entry.user?.name || 'Neznámy',
              hours: entry.hours,
              amount: entry.amount,
              isExtra,
            });
          }
        });
        
        // Get day of week (0 = Sunday, so we need to adjust for Slovak week starting Monday)
        const dayOfWeek = date.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        days.push({ 
          date, 
          hours: dayHours, 
          dayIndex, 
          budgetHours, 
          extraHours,
          userBreakdown: Array.from(userMap.values()).sort((a, b) => b.hours - a.hours),
          entries: dayEntries,
        });
      }
    });
    
    // Sort by date (oldest first)
    return days.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [timeEntries]);

  // Find max hours for scaling
  const maxHours = useMemo(() => {
    return Math.max(...dailyData.map(d => d.hours), 1);
  }, [dailyData]);

  const handleManualEntry = async () => {
    const hoursValue = parseFloat(hours);
    if (isNaN(hoursValue) || hoursValue <= 0) {
      toast({
        title: "Chyba",
        description: "Zadajte platný počet hodín",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, unknown> = {
        hours: hoursValue,
        date,
        description: description || undefined,
      };

      if (hourlyRate) {
        const rate = parseFloat(hourlyRate);
        if (!isNaN(rate) && rate > 0) {
          payload.hourly_rate = rate;
        }
      }

      const response = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: `Pridaných ${formatHours(hoursValue)}`,
        });

        setHours("");
        setDescription("");
        setHourlyRate("");
        setIsManualEntryOpen(false);
        fetchTimeEntries();
        
        if (onTimeEntryAdded) {
          onTimeEntryAdded();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa pridať záznam",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Naozaj chcete vymazať tento záznam?")) return;

    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: "Úspech", description: "Záznam bol vymazaný" });
        fetchTimeEntries();
        if (onTimeEntryAdded) {
          onTimeEntryAdded();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať záznam",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Section - Chart and Stats */}
      <div className="flex gap-6 flex-wrap">
        {/* Daily Activity Chart */}
        <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] flex-1 min-w-[300px]">
          <div className="border-b border-[#f8fafc] dark:border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold text-sm text-[#1d293d] dark:text-foreground tracking-[-0.15px]">
                Denná aktivita (Posl. 7 dní)
              </span>
            </div>
          </div>
          <div className="p-6 pt-8">
            {/* Bar Chart - Interactive */}
            <div className="flex items-end justify-between gap-4 h-[150px]">
              {dailyData.map((day, index) => {
                const heightPercent = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
                // Calculate actual budget vs extra percentages
                const totalDayHours = day.hours || 1;
                const budgetRatio = day.budgetHours / totalDayHours;
                const extraRatio = day.extraHours / totalDayHours;
                
                return (
                  <Popover key={index}>
                    <PopoverTrigger asChild>
                      <div 
                        className="flex flex-col items-center flex-1 gap-2 cursor-pointer group"
                        role="button"
                        tabIndex={0}
                        aria-label={`${format(day.date, "d. MMMM", { locale: sk })} - ${day.hours.toFixed(1)} hodín`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.currentTarget.click();
                          }
                        }}
                      >
                        <div className="w-full flex flex-col items-center justify-end h-[120px]">
                          {day.hours > 0 ? (
                            <div 
                              className="w-full max-w-[40px] flex flex-col rounded-t-sm overflow-hidden transition-all group-hover:scale-110 group-hover:shadow-lg"
                              style={{ height: `${Math.max(heightPercent, 5)}%` }}
                            >
                              {day.extraHours > 0 && (
                                <div 
                                  className="bg-[#22c55e] w-full transition-colors group-hover:bg-[#16a34a]" 
                                  style={{ height: `${extraRatio * 100}%`, minHeight: '4px' }}
                                />
                              )}
                              <div 
                                className="bg-[#155dfc] w-full flex-1 transition-colors group-hover:bg-[#1d4ed8]" 
                              />
                            </div>
                          ) : (
                            <div className="w-full max-w-[40px] h-1 bg-[#e2e8f0] dark:bg-muted rounded-sm group-hover:bg-[#cbd5e1] dark:group-hover:bg-muted/70 transition-colors" />
                          )}
                        </div>
                        <span className="text-xs text-[#94a3b8] dark:text-muted-foreground group-hover:text-[#64748b] dark:group-hover:text-foreground transition-colors">
                          {DAY_LABELS[day.dayIndex]}
                        </span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-72 p-0 bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-xl shadow-xl"
                      align="center"
                      sideOffset={8}
                    >
                      {/* Popover Header */}
                      <div className="px-4 py-3 border-b border-[#f1f5f9] dark:border-border">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-[#1d293d] dark:text-foreground">
                            {format(day.date, "EEEE, d. MMMM", { locale: sk })}
                          </span>
                          <span className="font-bold text-sm text-[#155dfc] dark:text-blue-400">
                            {day.hours.toFixed(1)}h
                          </span>
                        </div>
                      </div>
                      
                      {/* User Breakdown */}
                      <div className="p-2">
                        {day.userBreakdown.length === 0 ? (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            Žiadne záznamy
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {day.userBreakdown.map((user) => {
                              const avatarColor = getAvatarColor(user.userId);
                              return (
                                <div 
                                  key={user.userId}
                                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <Avatar className="h-7 w-7 shadow-sm">
                                    <AvatarFallback className={`text-[10px] font-normal ${avatarColor.bg} ${avatarColor.text}`}>
                                      {getInitials(user.userName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-xs text-[#314158] dark:text-foreground truncate">
                                        {user.userName}
                                      </span>
                                      {user.isExtra && (
                                        <Badge className="h-4 px-1.5 py-0 text-[8px] font-bold bg-[#f5f3ff] text-[#7f22fe] dark:bg-purple-950/50 dark:text-purple-400 border-0">
                                          EXTRA
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="font-bold text-xs text-[#0f172b] dark:text-foreground">
                                      {user.hours.toFixed(1)}h
                                    </span>
                                    {canViewPrices && (
                                      <span className="text-[10px] text-[#90a1b9] dark:text-muted-foreground">
                                        {Math.round(user.amount)} €
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* Footer with totals */}
                      {day.hours > 0 && (
                        <div className="px-4 py-2 border-t border-[#f1f5f9] dark:border-border bg-muted/30">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-sm bg-[#155dfc]" />
                                <span className="text-muted-foreground">Budget: {day.budgetHours.toFixed(1)}h</span>
                              </div>
                              {day.extraHours > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-sm bg-[#22c55e]" />
                                  <span className="text-muted-foreground">Extra: {day.extraHours.toFixed(1)}h</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-[#f1f5f9] dark:border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#155dfc]" />
                <span className="text-xs text-muted-foreground">Budget</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
                <span className="text-xs text-muted-foreground">Extra (T&M)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="flex flex-col gap-4 min-w-[200px]">
          {/* Total Hours Card */}
          <Card className="bg-[rgba(239,246,255,0.5)] dark:bg-blue-950/20 border border-[#dbeafe] dark:border-blue-900/50 rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className="bg-[#eff6ff]/50 dark:bg-blue-950/30 p-6 flex flex-col items-center justify-center gap-2">
              <span className="font-bold text-xs text-[#155dfc] dark:text-blue-400 tracking-[0.6px] uppercase">
                Total Hours
              </span>
              <span className="font-bold text-4xl text-[#0f172b] dark:text-foreground tracking-[0.37px]">
                {totalHours.toFixed(1)}
              </span>
              <span className="text-xs text-[#62748e] dark:text-muted-foreground">
                odpracované
              </span>
            </div>
          </Card>

          {/* Extra T&M Card */}
          <Card className="bg-[rgba(245,243,255,0.5)] dark:bg-purple-950/20 border border-[#ede9fe] dark:border-purple-900/50 rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className="bg-[#f5f3ff]/50 dark:bg-purple-950/30 p-6 flex flex-col items-center justify-center gap-2">
              <span className="font-bold text-xs text-[#7f22fe] dark:text-purple-400 tracking-[0.6px] uppercase">
                Extra (T&M)
              </span>
              <span className="font-bold text-4xl text-[#0f172b] dark:text-foreground tracking-[0.37px]">
                {Math.round(extraAmount)}€
              </span>
              <span className="text-xs text-[#62748e] dark:text-muted-foreground">
                fakturované navyše
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Detailed Time Entries */}
      <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-card border-b border-[#f1f5f9] dark:border-border flex items-center justify-between px-6 py-4">
          <span className="font-bold text-sm text-[#1d293d] dark:text-foreground tracking-[-0.15px]">
            Podrobný výkaz
          </span>
          <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="bg-[#0f172b] hover:bg-[#1e293b] text-white rounded-lg shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] gap-2"
              >
                <Plus className="h-4 w-4" />
                Zapísať čas
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Manuálny zápis času</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modal-hours" className="text-sm font-medium text-muted-foreground">Hodiny *</Label>
                    <Input
                      id="modal-hours"
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="2.5"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      disabled={isLoading}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-date" className="text-sm font-medium text-muted-foreground">Dátum *</Label>
                    <Input
                      id="modal-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={isLoading}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modal-hourly-rate" className="text-sm font-medium text-muted-foreground">
                    Hodinová sadzba (€) <span className="text-muted-foreground text-xs font-normal">- nepovinné</span>
                  </Label>
                  <Input
                    id="modal-hourly-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Auto-resolve ak prázdne"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    disabled={isLoading}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modal-description" className="text-sm font-medium text-muted-foreground">Poznámka</Label>
                  <Textarea
                    id="modal-description"
                    placeholder="Čo ste robili..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsManualEntryOpen(false)}
                    disabled={isLoading}
                  >
                    Zrušiť
                  </Button>
                  <Button
                    onClick={handleManualEntry}
                    disabled={isLoading || !hours}
                  >
                    {isLoading ? "Ukladám..." : "Pridať záznam"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Time Entries List */}
        <div className="flex flex-col">
          {timeEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-30" />
              <p>Žiadne časové záznamy</p>
            </div>
          ) : (
            timeEntries.map((entry, index) => {
              const entryDate = parseISO(entry.date);
              const avatarColor = getAvatarColor(entry.user_id);
              const isExtra = entry.billing_type === 'extra' || entry.billing_type === 'tm';
              const isLast = index === timeEntries.length - 1;
              
              return (
                <div 
                  key={entry.id} 
                  className={`flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors group ${!isLast ? 'border-b border-[#f1f5f9] dark:border-border' : ''}`}
                >
                  {/* Left Section - Date, Avatar, User */}
                  <div className="flex items-center gap-6 min-w-[200px]">
                    {/* Date */}
                    <div className="flex flex-col items-center w-10">
                      <span className="font-bold text-xs text-[#0f172b] dark:text-foreground">
                        {format(entryDate, "d")}
                      </span>
                      <span className="text-[10px] text-[#90a1b9] dark:text-muted-foreground uppercase tracking-wide">
                        {format(entryDate, "MMM", { locale: sk })}
                      </span>
                    </div>
                    
                    {/* Avatar */}
                    <Avatar className="h-7 w-7 shadow-[0px_0px_0px_2px_white,0px_1px_3px_0px_rgba(0,0,0,0.1)] dark:shadow-[0px_0px_0px_2px_#1e293b]">
                      <AvatarFallback className={`text-[10px] font-normal ${avatarColor.bg} ${avatarColor.text}`}>
                        {getInitials(entry.user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* User Name and Billing Type */}
                    <div className="flex flex-col">
                      <span className="font-medium text-xs text-[#314158] dark:text-foreground">
                        {getShortName(entry.user?.name)}
                      </span>
                      <span className="text-[10px] text-[#90a1b9] dark:text-muted-foreground">
                        {isExtra ? 'Extra' : 'Budget'}
                      </span>
                    </div>
                  </div>

                  {/* Middle Section - Description and Badge */}
                  <div className="flex-1 flex flex-col gap-1.5 pl-4">
                    <span className="font-medium text-xs text-[#1d293d] dark:text-foreground line-clamp-1">
                      {entry.description || '—'}
                    </span>
                    <div className="flex gap-2 items-center">
                      {entry.description && (
                        <Badge 
                          variant="outline" 
                          className="h-4 px-2 py-0 text-[9px] font-medium text-[#62748e] dark:text-muted-foreground border-[#e2e8f0] dark:border-border rounded-lg"
                        >
                          Práca
                        </Badge>
                      )}
                      {isExtra && (
                        <Badge 
                          className="h-4 px-2 py-0 text-[9px] font-bold bg-[#f5f3ff] text-[#7f22fe] dark:bg-purple-950/50 dark:text-purple-400 border border-[#ede9fe] dark:border-purple-900/50 rounded-lg"
                        >
                          EXTRA
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right Section - Hours and Amount */}
                  <div className="flex flex-col items-end min-w-[80px]">
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-bold text-sm text-[#0f172b] dark:text-foreground tracking-[-0.15px]">
                        {entry.hours.toFixed(1)}
                      </span>
                      <span className="text-xs text-[#90a1b9] dark:text-muted-foreground">
                        h
                      </span>
                    </div>
                    {canViewPrices && (
                      <span className="text-[10px] text-[#90a1b9] dark:text-muted-foreground">
                        {Math.round(entry.amount)} €
                      </span>
                    )}
                  </div>

                  {/* Delete Button */}
                  {canDeleteTimeEntries && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="h-7 w-7 p-0 ml-2 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

