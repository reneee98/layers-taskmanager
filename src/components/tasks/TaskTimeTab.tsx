"use client";

import { useState, useEffect } from "react";
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
import { Plus, Activity, Trash2, Zap, Pencil, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatHours } from "@/lib/format";
import { format, parseISO } from "date-fns";
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
  onTimeEntryAdded?: () => void;
}

// Avatar color palettes for different users
const AVATAR_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-600 dark:text-blue-400" }, // Blue - René M.
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400" }, // Green - Viktor Beňo
  { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-brand" }, // Purple - Jana K.
  { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-600 dark:text-amber-400" }, // Yellow
  { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-600 dark:text-pink-400" }, // Pink
  { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-600 dark:text-teal-400" }, // Teal
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

export function TaskTimeTab({ taskId, onTimeEntryAdded }: TaskTimeTabProps) {
  const { hasPermission: canViewPrices } = usePermission("financial", "view_prices");
  const { hasPermission: canDeleteTimeEntries } = usePermission("time_entries", "delete");
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isExtraEntry, setIsExtraEntry] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");

  // Fetch time entries for the task
  const fetchTimeEntries = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/time`);
      const result = await response.json();
      if (result.success && result.data) {
        // Sort by date descending (newest first)
        const sortedEntries = result.data.sort(
          (a: TimeEntry, b: TimeEntry) => new Date(b.date).getTime() - new Date(a.date).getTime()
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

  // Listen for timer stopped event to refresh entries
  useEffect(() => {
    const handleTimerStopped = () => {
      // Small delay to ensure backend has saved the time entry
      setTimeout(() => {
        fetchTimeEntries();
      }, 500);
    };

    window.addEventListener("timerStopped", handleTimerStopped);
    return () => {
      window.removeEventListener("timerStopped", handleTimerStopped);
    };
  }, [taskId]);

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

      // Add billing_type for extra time
      if (isExtraEntry) {
        payload.billing_type = "extra";
        payload.is_billable = false;
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
          description: isExtraEntry
            ? `Pridaných ${formatHours(hoursValue)} extra času`
            : `Pridaných ${formatHours(hoursValue)}`,
        });

        setHours("");
        setDescription("");
        setHourlyRate("");
        setIsExtraEntry(false);
        setIsManualEntryOpen(false);
        fetchTimeEntries();

        // Dispatch event for other components to refresh
        window.dispatchEvent(new CustomEvent("timeEntryAdded"));

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

  const handleStartEditDescription = (entry: TimeEntry) => {
    setEditingEntryId(entry.id);
    setEditingDescription(entry.description || "");
  };

  const handleSaveDescription = async () => {
    if (!editingEntryId) return;

    try {
      const response = await fetch(`/api/time-entries/${editingEntryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editingDescription }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: "Úspech", description: "Popis bol aktualizovaný" });
        fetchTimeEntries();
        setEditingEntryId(null);
        setEditingDescription("");
      } else {
        throw new Error(result.error);
      }
    } catch {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať popis",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditingDescription("");
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
    } catch {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať záznam",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <Card className="bg-white dark:bg-card border border-border dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-card border-b border-border/60 dark:border-border flex items-center justify-between px-6 py-4">
          <span className="font-bold text-sm text-foreground dark:text-foreground">
            Podrobný výkaz
          </span>
          <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] gap-2"
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
                    <Label
                      htmlFor="modal-hours"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Hodiny *
                    </Label>
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
                    <Label
                      htmlFor="modal-date"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Dátum *
                    </Label>
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
                  <Label
                    htmlFor="modal-hourly-rate"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Hodinová sadzba (€){" "}
                    <span className="text-muted-foreground text-xs font-normal">- nepovinné</span>
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
                  <Label
                    htmlFor="modal-description"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Poznámka
                  </Label>
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

                {/* Extra time toggle */}
                <button
                  type="button"
                  onClick={() => setIsExtraEntry(!isExtraEntry)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isExtraEntry
                      ? "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/60 dark:bg-purple-950/30 dark:border-purple-900/50"
                      : "bg-muted/30 border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isExtraEntry
                          ? "bg-violet-100 dark:bg-violet-900/40 dark:bg-purple-900/50"
                          : "bg-muted dark:bg-muted"
                      }`}
                    >
                      <Zap
                        className={`h-4 w-4 ${
                          isExtraEntry ? "text-brand dark:text-purple-400" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="text-left">
                      <div
                        className={`text-sm font-medium ${
                          isExtraEntry ? "text-brand dark:text-purple-400" : "text-foreground"
                        }`}
                      >
                        Extra čas
                      </div>
                      <div className="text-xs text-muted-foreground">Čas mimo scope projektu</div>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      isExtraEntry ? "bg-brand" : "bg-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        isExtraEntry ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </div>
                </button>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsManualEntryOpen(false)}
                    disabled={isLoading}
                  >
                    Zrušiť
                  </Button>
                  <Button onClick={handleManualEntry} disabled={isLoading || !hours}>
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
              const isExtra = entry.billing_type === "extra" || entry.billing_type === "tm";
              const isLast = index === timeEntries.length - 1;

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors group ${!isLast ? "border-b border-border/60 dark:border-border" : ""}`}
                >
                  {/* Left Section - Date, Avatar, User */}
                  <div className="flex items-center gap-6 min-w-[200px]">
                    {/* Date */}
                    <div className="flex flex-col items-center w-10">
                      <span className="font-bold text-xs text-foreground dark:text-foreground">
                        {format(entryDate, "d")}
                      </span>
                      <span className="text-[10px] text-muted-foreground dark:text-muted-foreground uppercase tracking-wide">
                        {format(entryDate, "MMM", { locale: sk })}
                      </span>
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-7 w-7 shadow-[0px_0px_0px_2px_white,0px_1px_3px_0px_rgba(0,0,0,0.1)] dark:shadow-[0px_0px_0px_2px_#1e293b]">
                      <AvatarFallback
                        className={`text-[10px] font-normal ${avatarColor.bg} ${avatarColor.text}`}
                      >
                        {getInitials(entry.user?.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* User Name and Billing Type */}
                    <div className="flex flex-col">
                      <span className="font-medium text-xs text-foreground dark:text-foreground">
                        {getShortName(entry.user?.name)}
                      </span>
                      <span className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                        {isExtra ? "Extra" : "Budget"}
                      </span>
                    </div>
                  </div>

                  {/* Middle Section - Description and Badge */}
                  <div className="flex-1 flex flex-col gap-1.5 pl-4">
                    {editingEntryId === entry.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          placeholder="Popis práce..."
                          className="h-7 text-xs flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveDescription();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveDescription}
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-2 group/desc cursor-pointer"
                        onClick={() => handleStartEditDescription(entry)}
                      >
                        <span className="font-medium text-xs text-foreground dark:text-foreground line-clamp-1">
                          {entry.description || "—"}
                        </span>
                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/desc:opacity-100 transition-opacity" />
                      </div>
                    )}
                    {isExtra && (
                      <Badge className="h-4 px-2 py-0 text-[9px] font-bold bg-violet-50 dark:bg-violet-950/30 text-brand dark:bg-purple-950/50 dark:text-purple-400 border border-violet-200 dark:border-violet-800/60 dark:border-purple-900/50 rounded-lg">
                        EXTRA
                      </Badge>
                    )}
                  </div>

                  {/* Right Section - Hours and Amount */}
                  <div className="flex flex-col items-end min-w-[80px]">
                    <span className="font-bold text-sm text-foreground dark:text-foreground tabular-nums">
                      {formatHours(entry.hours)}
                    </span>
                    {canViewPrices && (
                      <span className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                        {entry.amount.toFixed(2)} €
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
