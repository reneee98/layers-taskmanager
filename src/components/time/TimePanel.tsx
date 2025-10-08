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
}

interface Task {
  id: string;
  title: string;
  project_id: string;
}

interface TimePanelProps {
  projectId: string;
  tasks: Task[];
  defaultTaskId?: string;
}

export function TimePanel({ projectId, tasks, defaultTaskId }: TimePanelProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(defaultTaskId || "");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

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

      // Sort by date descending
      allEntries.sort((a, b) => b.date.localeCompare(a.date));
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

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleStartTimer = () => {
    if (!selectedTaskId) {
      toast({
        title: "Chyba",
        description: "Vyberte úlohu",
        variant: "destructive",
      });
      return;
    }
    setIsTimerRunning(true);
    setTimerSeconds(0);
  };

  const handleStopTimer = async () => {
    setIsTimerRunning(false);
    const trackedHours = Number((timerSeconds / 3600).toFixed(3));

    if (trackedHours > 0 && selectedTaskId) {
      await handleSubmitTimeEntry(trackedHours);
      setTimerSeconds(0);
    }
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
                disabled={isTimerRunning}
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
                {formatTimerDisplay(timerSeconds)}
              </div>
              {isTimerRunning ? (
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

            {isTimerRunning && (
              <p className="text-sm text-muted-foreground">
                Časovač beží • {formatHours(timerSeconds / 3600)}
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Žiadne záznamy
                    </TableCell>
                  </TableRow>
                ) : (
                  timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), "dd.MM.yyyy")}</TableCell>
                      <TableCell className="font-medium">
                        {getTaskTitle(entry.task_id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">U</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">User</span>
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
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {entry.description || "—"}
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

