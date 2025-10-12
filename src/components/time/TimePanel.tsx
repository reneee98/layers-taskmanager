"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Play, Square, Clock, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTimer } from "@/contexts/TimerContext";
import { formatHours, formatCurrency } from "@/lib/format";
import { format } from "date-fns";

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
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(defaultTaskId || "");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});
  
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
          console.log("Time entries for task", taskId, ":", result.data);
          allEntries.push(...result.data);
        }
      }

      // Sort by created_at descending (newest first)
      allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      console.log("All time entries:", allEntries);
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
    console.log("TimePanel: handleStartTimer called", { selectedTaskId, tasks });
    
    if (!selectedTaskId) {
      toast({
        title: "Chyba",
        description: "Vyberte úlohu",
        variant: "destructive",
      });
      return;
    }
    
    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    console.log("TimePanel: selectedTask found", selectedTask);
    console.log("TimePanel: project_name", selectedTask?.project_name);
    console.log("TimePanel: project_id", selectedTask?.project_id);
    
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
            } else {
              console.error("Failed to save previous timer:", result.error);
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
      
      console.log("TimePanel: Calling startTimer", { selectedTaskId, title: selectedTask.title, projectId: selectedTask.project_id || projectId });
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
      // Vypočítaj start a end time pre časovač - rovnaká logika ako v GlobalTimer
      const now = new Date();
      const endTime = now.toTimeString().slice(0, 8); // HH:mm:ss format
      const startTime = new Date(now.getTime() - (currentDuration * 1000)).toTimeString().slice(0, 8); // HH:mm:ss format
      
      try {
        // Automaticky zapísať čas do úlohy - rovnaká logika ako v GlobalTimer
        const payload = {
          hours: trackedHours,
          date: now.toISOString().split("T")[0],
          description: "", // Prázdna poznámka - používateľ si ju dopíše sám
          start_time: startTime,
          end_time: endTime,
        };

        console.log("TimePanel: Sending time entry data:", payload);

        const response = await fetch(`/api/tasks/${activeTimer.task_id}/time`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        console.log("TimePanel: API response:", result);

        if (result.success) {
          toast({
            title: "Časovač zastavený",
            description: `Zapísaných ${formatTime(currentDuration)} do úlohy.`,
          });

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
        console.error("TimePanel: Error saving time entry:", error);
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
        // Refresh entries to get updated data
        fetchTimeEntries();
        
        // Notify parent component
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

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalAmount = timeEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="space-y-6">
      {/* Time Entry Form */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Timer Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="timer-task">Úloha</Label>
              <select
                id="timer-task"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!!activeTimer && activeTimer.task_id !== selectedTaskId}
              >
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="text-3xl font-mono font-bold">
                {activeTimer && activeTimer.task_id === selectedTaskId ? formatTimerDisplay(currentDuration) : "00:00:00"}
              </div>
              {activeTimer && activeTimer.task_id === selectedTaskId ? (
                <Button onClick={handleStopTimer} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button onClick={handleStartTimer}>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
              )}
            </div>

            {activeTimer && activeTimer.task_id === selectedTaskId && (
              <p className="text-sm text-muted-foreground">
                Časovač beží • {formatHours(currentDuration / 3600)} • Zobrazený v headeri
              </p>
            )}

            {activeTimer && activeTimer.task_id !== selectedTaskId && (
              <p className="text-sm text-muted-foreground">
                Aktívny časovač v inej úlohe: "{activeTimer.task_name}"
              </p>
            )}
          </CardContent>
        </Card>

        {/* Manual Entry Card */}
        <Card>
          <CardHeader>
            <CardTitle>Manuálny zápis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hours">Hodiny *</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="2.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="date">Dátum *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="manual-hourly-rate">
                Hodinová sadzba (€) <span className="text-muted-foreground text-xs">- nepovinné</span>
              </Label>
              <Input
                id="manual-hourly-rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="Auto-resolve ak prázdne"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="description">Poznámka</Label>
              <Textarea
                id="description"
                placeholder="Čo ste robili..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <Button
              onClick={handleManualEntry}
              disabled={isLoading || !hours}
              className="w-full"
            >
              {isLoading ? "Ukladám..." : "Pridať záznam"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Time Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Záznamy času</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dátum</TableHead>
                  <TableHead>Čas</TableHead>
                  <TableHead>Úloha</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Trvanie</TableHead>
                  <TableHead className="text-right">Sadzba</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead>Poznámka</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Žiadne záznamy
                    </TableCell>
                  </TableRow>
                ) : (
                  timeEntries.map((entry) => (
                    <TableRow key={entry.id} className="group">
                      <TableCell>{format(new Date(entry.date), "dd.MM.yyyy")}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {(() => {
                          // Kontrola či existujú časy
                          if (entry.start_time && entry.end_time) {
                            // Zobraz časy priamo ak sú v správnom formáte
                            if (typeof entry.start_time === 'string' && typeof entry.end_time === 'string') {
                              // Ak sú časy v formáte HH:mm:ss alebo HH:mm:ss.xxx
                              if (entry.start_time.includes(':') && entry.end_time.includes(':')) {
                                const startTime = entry.start_time.split('.')[0]; // Odstráň milisekundy ak existujú
                                const endTime = entry.end_time.split('.')[0]; // Odstráň milisekundy ak existujú
                                return `${startTime} - ${endTime}`;
                              }
                            }
                            
                            // Fallback - skús formátovať ako dátumy
                            try {
                              const startDate = new Date(entry.start_time);
                              const endDate = new Date(entry.end_time);
                              if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                                return "—";
                              }
                              return `${format(startDate, "HH:mm:ss")} - ${format(endDate, "HH:mm:ss")}`;
                            } catch (error) {
                              console.error("Error formatting times:", error);
                              return "—";
                            }
                          } else {
                            return format(new Date(entry.created_at), "HH:mm:ss");
                          }
                        })()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getTaskTitle(entry.task_id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {entry.user?.display_name ? entry.user.display_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{entry.user?.display_name || 'Neznámy'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatHours(entry.hours)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(entry.hourly_rate)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                        <Input
                          value={editingDescriptions[entry.id] !== undefined ? editingDescriptions[entry.id] : (entry.description || "")}
                          onChange={(e) => handleDescriptionChange(entry.id, e.target.value)}
                          onBlur={() => handleDescriptionBlur(entry.id)}
                          placeholder="Poznámka..."
                          className="text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          {timeEntries.length > 0 && (
            <div className="mt-4 flex justify-end gap-8 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Celkom hodín:</span>
                <span className="font-mono font-semibold">{formatHours(totalHours)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Labor cost:</span>
                <span className="font-mono font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

