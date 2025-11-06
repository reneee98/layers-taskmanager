"use client";

import { useState, useEffect } from "react";
import { usePermission } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Play, Square, Clock, Trash2, Calendar, User, Timer, Euro, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTimer } from "@/contexts/TimerContext";
import { formatHours, formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

interface Task {
  id: string;
  title: string;
  project_id: string;
  project_name?: string;
}

interface TimePanelProps {
  projectId: string;
  tasks: Task[];
  defaultTaskId?: string;
  onTimeEntryAdded?: () => void;
}

export function TimePanel({ projectId, tasks, defaultTaskId, onTimeEntryAdded }: TimePanelProps) {
  const { hasPermission: canViewHourlyRates } = usePermission('financial', 'view_hourly_rates');
  const { hasPermission: canViewPrices } = usePermission('financial', 'view_prices');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(defaultTaskId || "");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  
  // Use global timer
  const { activeTimer, currentDuration, startTimer, stopTimer } = useTimer();
  
  // Format time function (same as in GlobalTimer)
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch time entries for all project tasks
  const fetchTimeEntries = async () => {
    try {
      const taskIds = tasks.map((t) => t.id);
      const allEntries: TimeEntry[] = [];

      for (const taskId of taskIds) {
        const response = await fetch(`/api/tasks/${taskId}/time`);
        const result = await response.json();
        if (result.success && result.data) {
          allEntries.push(...result.data);
        }
      }

      // Sort by created_at descending (newest first)
      allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTimeEntries(allEntries);
    } catch (error) {
      console.error("Failed to fetch time entries:", error);
    }
  };

  useEffect(() => {
    if (tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
      fetchTimeEntries();
    }
  }, [tasks]);


  const handleStartTimer = async () => {
    if (!selectedTaskId) {
      toast({
        title: "Chyba",
        description: "Vyberte úlohu",
        variant: "destructive",
      });
      return;
    }
    
    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    
    if (selectedTask) {
      // If there's an active timer for a different task, save it first
      if (activeTimer && activeTimer.task_id !== selectedTaskId) {
        // Calculate duration from activeTimer
        const startedAt = new Date(activeTimer.started_at);
        const now = new Date();
        const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const trackedHours = Number((duration / 3600).toFixed(3));
        
        if (trackedHours > 0) {
          // Vypočítaj start a end time pre časovač
          const endTime = now.toTimeString().slice(0, 8); // HH:mm:ss format
          const startTime = new Date(now.getTime() - (duration * 1000)).toTimeString().slice(0, 8); // HH:mm:ss format
          
          try {
            // Automaticky zapísať čas do úlohy
            const payload = {
              hours: trackedHours,
              date: now.toISOString().split("T")[0],
              description: `Časovač - ${formatTime(duration)}`,
              start_time: startTime,
              end_time: endTime,
            };

            const response = await fetch(`/api/tasks/${activeTimer.task_id}/time`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.success) {
              toast({
                title: "Predchádzajúci časovač uložený",
                description: `Zapísaných ${formatTime(duration)} do úlohy "${activeTimer.task_name}".`,
              });
              
              // Refresh entries
              fetchTimeEntries();
              
              // Notify parent component
              if (onTimeEntryAdded) {
                onTimeEntryAdded();
              }
            }
          } catch (error) {
            console.error("Error saving previous timer:", error);
            toast({
              title: "Chyba",
              description: "Nepodarilo sa uložiť predchádzajúci časovač",
              variant: "destructive",
            });
          }
        }
        
        // Stop the previous timer
        await stopTimer();
      }
      
      await startTimer(selectedTaskId, selectedTask.title, selectedTask.project_id || projectId, selectedTask.project_name || "Neznámy projekt");
      toast({
        title: "Časovač spustený",
        description: `Časovač pre úlohu "${selectedTask.title}" bol spustený.`,
      });
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer || activeTimer.task_id !== selectedTaskId) return;

    const trackedHours = Number((currentDuration / 3600).toFixed(3));

    if (trackedHours > 0) {
      const now = new Date();
      const endTime = now.toTimeString().slice(0, 8);
      const startTime = new Date(now.getTime() - (currentDuration * 1000)).toTimeString().slice(0, 8);
      
      try {
        const payload = {
          hours: trackedHours,
          date: now.toISOString().split("T")[0],
          description: "",
          start_time: startTime,
          end_time: endTime,
        };

        const response = await fetch(`/api/tasks/${activeTimer.task_id}/time`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          toast({
            title: "Časovač zastavený",
            description: `Zapísaných ${formatTime(currentDuration)} do úlohy.`,
          });

          fetchTimeEntries();
          
          if (onTimeEntryAdded) {
            onTimeEntryAdded();
          }
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error saving time entry:", error);
        toast({
          title: "Chyba",
          description: error instanceof Error ? error.message : "Nepodarilo sa uložiť čas do úlohy",
          variant: "destructive",
        });
      }
    }
    await stopTimer();
  };

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

    await handleSubmitTimeEntry(hoursValue);
  };

  const handleSubmitTimeEntry = async (hoursValue: number) => {
    if (!selectedTaskId) {
      toast({
        title: "Chyba",
        description: "Vyberte úlohu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        hours: hoursValue,
        date,
        description: description || undefined,
      };

      // Add hourly_rate if provided
      if (hourlyRate) {
        const rate = parseFloat(hourlyRate);
        if (!isNaN(rate) && rate > 0) {
          payload.hourly_rate = rate;
        }
      }

      const response = await fetch(`/api/tasks/${selectedTaskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: `Pridaných ${formatHours(hoursValue)} • ${formatCurrency(result.data.timeEntry.amount)}`,
        });

        // Reset form
        setHours("");
        setDescription("");
        setHourlyRate("");
        setIsManualEntryOpen(false);

        // Refresh entries
        fetchTimeEntries();
        
        // Notify parent component
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

  const handleDescriptionChange = (entryId: string, value: string) => {
    setEditingDescriptions(prev => ({
      ...prev,
      [entryId]: value
    }));
  };

  const handleDescriptionBlur = async (entryId: string) => {
    const newDescription = editingDescriptions[entryId];
    if (newDescription === undefined) return;

    try {
      const response = await fetch(`/api/time-entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newDescription,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchTimeEntries();
        
        if (onTimeEntryAdded) {
          onTimeEntryAdded();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to update time entry:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa uložiť poznámku",
        variant: "destructive",
      });
    }
  };

  const formatTimerDisplay = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTaskTitle = (taskId: string) => {
    return tasks.find((t) => t.id === taskId)?.title || "—";
  };

  const formatTimeRange = (entry: TimeEntry) => {
    if (entry.start_time && entry.end_time) {
      if (typeof entry.start_time === 'string' && typeof entry.end_time === 'string') {
        if (entry.start_time.includes(':') && entry.end_time.includes(':')) {
          const startTime = entry.start_time.split('.')[0];
          const endTime = entry.end_time.split('.')[0];
          return `${startTime} - ${endTime}`;
        }
      }
      
      try {
        const startDate = new Date(entry.start_time);
        const endDate = new Date(entry.end_time);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          return `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`;
        }
      } catch (error) {
        console.error("Error formatting times:", error);
      }
    }
    return format(new Date(entry.created_at), "HH:mm");
  };

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalAmount = timeEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="space-y-6">
        {/* Timer Card */}
      <Card className="bg-card border border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Timer className="h-4 w-4" />
                Časovač
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
                <div className="text-3xl font-semibold text-foreground tabular-nums">
                {activeTimer && activeTimer.task_id === selectedTaskId ? formatTimerDisplay(currentDuration) : "00:00:00"}
              </div>
              {activeTimer && activeTimer.task_id === selectedTaskId ? (
                  <Button onClick={handleStopTimer} variant="destructive" size="sm" className="gap-2">
                    <Square className="h-4 w-4" />
                    Zastaviť
                </Button>
              ) : (
                  <Button onClick={handleStartTimer} size="sm" className="gap-2">
                    <Play className="h-4 w-4" />
                    Spustiť
                </Button>
              )}
            </div>

            {activeTimer && activeTimer.task_id === selectedTaskId && (
                <p className="text-xs text-muted-foreground">
                  Časovač beží • {formatHours(currentDuration / 3600)}
              </p>
            )}

            {activeTimer && activeTimer.task_id !== selectedTaskId && (
                <p className="text-xs text-muted-foreground">
                Aktívny časovač v inej úlohe: "{activeTimer.task_name}"
              </p>
            )}
            </div>

            {/* Manual Entry Button */}
            <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-[calc(2.25rem+2rem+2px)] w-[calc(2.25rem+2rem+2px)] p-0 flex-shrink-0 self-start mt-9">
                  <Plus className="h-5 w-5" />
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
                        className="h-[2.5rem]"
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
                        className="h-[2.5rem]"
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
                      className="h-[2.5rem]"
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
          </CardContent>
        </Card>

      {/* Time Entries List */}
      {timeEntries.length > 0 ? (
        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Dátum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Čas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Poznámka</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Používateľ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Trvanie</th>
                    {canViewHourlyRates && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Sadzba</th>
                    )}
                    {canViewPrices && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Suma</th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border hover:bg-muted/50 transition-colors group">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {format(new Date(entry.date), "dd.MM.yyyy")}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatTimeRange(entry)}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={editingDescriptions[entry.id] !== undefined ? editingDescriptions[entry.id] : (entry.description || "")}
                          onChange={(e) => handleDescriptionChange(entry.id, e.target.value)}
                          onBlur={() => handleDescriptionBlur(entry.id)}
                          placeholder="Poznámka..."
                          className="h-[2rem] text-xs w-full min-w-[150px]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                              {entry.user?.name ? entry.user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">{entry.user?.name || 'Neznámy'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                        {formatHours(entry.hours)}
                      </td>
                      {canViewHourlyRates && (
                        <td className="px-4 py-3 text-right text-sm text-foreground">
                          {formatCurrency(entry.hourly_rate)}
                        </td>
                      )}
                      {canViewPrices && (
                        <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                          {formatCurrency(entry.amount)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/30">
                    <td colSpan={3} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Celkom:
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {formatHours(totalHours)}
                    </td>
                    {canViewHourlyRates && (
                      <td className="px-4 py-3"></td>
                    )}
                    {canViewPrices && (
                      <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                        {formatCurrency(totalAmount)}
                      </td>
                    )}
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Žiadne časové záznamy</p>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
