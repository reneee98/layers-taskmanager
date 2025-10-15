"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  User,
  Edit,
  Trash2,
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
  FolderOpen
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

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
    return format(new Date(dateString), 'dd.MM.yyyy', { locale: sk });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return null;
    return format(new Date(timeString), 'HH:mm', { locale: sk });
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Načítavam časové záznamy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Časové záznamy</h1>
          <p className="text-muted-foreground">
            Prehľad všetkých časových záznamov v workspace
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celkové hodiny</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalHours().toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fakturovateľné hodiny</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getBillableHours().toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celková suma</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalAmount())}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Počet záznamov</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeEntries.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Časové záznamy</CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Žiadne časové záznamy</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dátum</TableHead>
                  <TableHead>Používateľ</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Úloha</TableHead>
                  <TableHead>Hodiny</TableHead>
                  <TableHead>Sadzba</TableHead>
                  <TableHead>Suma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Akcie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
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
                          <div className="font-medium">{entry.tasks.projects.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.tasks.projects.code}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]" title={entry.tasks.title}>
                          {entry.tasks.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{entry.hours}h</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(entry.hourly_rate)}/h</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">{formatCurrency(entry.amount)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.is_billable ? "default" : "secondary"}>
                        {entry.is_billable ? "Fakturovateľné" : "Nefakturovateľné"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTimeEntry(entry.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}
