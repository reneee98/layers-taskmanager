"use client";

import { useState, useEffect } from "react";
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
  Calendar,
  Trash2,
  DollarSign,
  CheckCircle,
  Building2,
  FolderOpen
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { PageHeader } from "@/components/layout/page-header";
import { PageState } from "@/components/layout/page-state";
import { MetricStrip } from "@/components/layout/metric-strip";
import { formatHours } from "@/lib/format";

interface TimeEntry {
  id: string;
  hours: number;
  date: string;
  description: string | null;
  hourly_rate: number;
  amount: number;
  is_billable: boolean;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  tasks: {
    id: string;
    title: string;
    project_id: string;
    projects: {
      id: string;
      name: string;
      code: string;
    };
  };
  profiles: {
    id: string;
    display_name: string;
    email: string;
  };
}

export default function TimeEntriesPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const workspaceId = workspace?.id;
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceLoading || !workspaceId) return;

    const fetchTimeEntries = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/time-entries?workspace_id=${workspaceId}`);
        const data = await response.json();

        if (data.success) {
          setTimeEntries(data.data || []);
        } else {
          setError(data.error || "Failed to fetch time entries");
        }
      } catch (err) {
        setError("Failed to fetch time entries");
        console.error("Error fetching time entries:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeEntries();
  }, [workspaceId, workspaceLoading]);

  const handleDeleteTimeEntry = async (id: string) => {
    if (!confirm("Naozaj chcete vymazať tento časový záznam?")) return;

    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTimeEntries(prev => prev.filter(entry => entry.id !== id));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete time entry");
      }
    } catch (err) {
      console.error("Error deleting time entry:", err);
      alert("Failed to delete time entry");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return format(date, 'dd.MM.yyyy', { locale: sk });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return null;
    // Handle time-only values like "14:30" or "14:30:00"
    const timeOnlyMatch = timeString.match(/^(\d{1,2}):(\d{2})(:\d{2})?/);
    if (timeOnlyMatch && !timeString.includes("T")) {
      return `${timeOnlyMatch[1].padStart(2, "0")}:${timeOnlyMatch[2]}`;
    }
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return null;
    return format(date, 'HH:mm', { locale: sk });
  };

  const getTotalHours = () => {
    return timeEntries.reduce((total, entry) => total + entry.hours, 0);
  };

  const getTotalAmount = () => {
    return timeEntries.reduce((total, entry) => total + entry.amount, 0);
  };

  const getBillableHours = () => {
    return timeEntries
      .filter(entry => entry.is_billable)
      .reduce((total, entry) => total + entry.hours, 0);
  };

  if (workspaceLoading || loading) {
    return <PageState variant="loading" title="Načítavam časové záznamy" />;
  }

  if (error) {
    return (
      <PageState variant="error" title="Časové záznamy sa nepodarilo načítať" description={error} />
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Časové záznamy"
        description="Odpracovaný čas, sadzby a fakturovateľnosť naprieč workspace."
        icon={Clock}
      />

      <MetricStrip
        items={[
          { label: "Celkové hodiny", value: formatHours(getTotalHours()), icon: Clock },
          { label: "Fakturovateľné", value: formatHours(getBillableHours()), icon: CheckCircle },
          { label: "Celková suma", value: formatCurrency(getTotalAmount()), icon: DollarSign },
          { label: "Počet záznamov", value: timeEntries.length, icon: Calendar },
        ]}
      />

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border bg-muted/[0.16] px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Všetky záznamy</h2>
          <p className="mt-1 text-xs text-muted-foreground">Chronologický prehľad vykázanej práce.</p>
        </div>
          {timeEntries.length === 0 ? (
            <PageState compact icon={Clock} title="Zatiaľ tu nie je vykázaný čas" className="rounded-none border-0" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Dátum</TableHead>
                  <TableHead>Používateľ</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Úloha</TableHead>
                  <TableHead>Hodiny</TableHead>
                  <TableHead>Sadzba</TableHead>
                  <TableHead>Suma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id} className="group hover:bg-muted/25">
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(entry.date)}</span>
                      </div>
                      {entry.start_time && entry.end_time && (
                        <div className="text-sm text-muted-foreground">
                          {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {entry.profiles.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{entry.profiles.display_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.profiles.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{entry.tasks?.projects?.name || "Bez projektu"}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.tasks?.projects?.code || ""}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]" title={entry.tasks?.title || ""}>
                          {entry.tasks?.title || "Bez úlohy"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatHours(entry.hours)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(entry.hourly_rate)}/h</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold tabular-nums">{formatCurrency(entry.amount)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.is_billable ? "default" : "secondary"}>
                        {entry.is_billable ? "Fakturovateľné" : "Nefakturovateľné"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Odstrániť časový záznam"
                          onClick={() => handleDeleteTimeEntry(entry.id)}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </section>
    </div>
  );
}
