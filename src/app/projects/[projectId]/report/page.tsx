"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Loader2, Clock, Euro, Users, FileText, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatHours } from "@/lib/format";
import { format } from "date-fns";
import type { Project, Task } from "@/types/database";

export default function ProjectReportPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch project
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectResult = await projectResponse.json();
      if (projectResult.success) {
        setProject(projectResult.data);
      }

      // Fetch tasks
      const tasksResponse = await fetch(`/api/tasks?project_id=${projectId}`);
      const tasksResult = await tasksResponse.json();
      if (tasksResult.success) {
        setTasks(tasksResult.data);
      }

      // Fetch time entries for all tasks
      const timeEntriesData = await Promise.all(
        (tasksResult.data || []).map(async (task: Task) => {
          const response = await fetch(`/api/tasks/${task.id}/time`);
          const result = await response.json();
          return {
            taskId: task.id,
            taskTitle: task.title,
            timeEntries: result.success ? result.data : []
          };
        })
      );
      setTimeEntries(timeEntriesData);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať dáta pre report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleDownloadPDF = () => {
    window.print();
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'todo': 'Na urobiť',
      'in_progress': 'Prebieha',
      'review': 'Na kontrole',
      'done': 'Hotovo',
      'cancelled': 'Zrušené'
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      'low': 'Nízka',
      'medium': 'Stredná',
      'high': 'Vysoká',
      'urgent': 'Urgentné'
    };
    return priorityMap[priority] || priority;
  };

  const getStatusBadgeVariant = (status: string) => {
    const variantMap: { [key: string]: string } = {
      'todo': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      'in_progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'review': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'done': 'bg-green-500/10 text-green-500 border-green-500/20',
      'cancelled': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return variantMap[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getPriorityBadgeVariant = (priority: string) => {
    const variantMap: { [key: string]: string } = {
      'low': 'bg-green-500/10 text-green-500 border-green-500/20',
      'medium': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'high': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'urgent': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return variantMap[priority] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Načítavam report...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Projekt nebol nájdený</p>
      </div>
    );
  }

  const totalHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
  const totalPrice = tasks.reduce((sum, task) => sum + (task.calculated_price || 0), 0);

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Header - only visible on screen */}
      <div className="sticky top-0 z-10 bg-background border-b print:hidden">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Späť na projekt
              </Button>
              <h1 className="text-xl font-semibold">Report - {project.name}</h1>
            </div>
            <Button onClick={handleDownloadPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Stiahnuť PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="container mx-auto px-6 py-8 print:py-0 space-y-8">
        {/* Project Header */}
        <Card className="print:shadow-none">
          <CardHeader className="text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {project.code}
              </Badge>
              <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span><strong>Klient:</strong> {project.client?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span><strong>Dátum:</strong> {format(new Date(), 'dd.MM.yyyy HH:mm')}</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Úlohy</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.length}</div>
              <p className="text-xs text-muted-foreground">Celkový počet úloh</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hodiny</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(totalHours)}</div>
              <p className="text-xs text-muted-foreground">Odpracované hodiny</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cena</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPrice)}</div>
              <p className="text-xs text-muted-foreground">Celková cena</p>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Úlohy a časy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Úloha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priorita</TableHead>
                    <TableHead className="text-right">Odhadené hodiny</TableHead>
                    <TableHead className="text-right">Odpracované hodiny</TableHead>
                    <TableHead className="text-right">Cena</TableHead>
                    <TableHead>Deadline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeVariant(task.status)}>
                          {getStatusText(task.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityBadgeVariant(task.priority)}>
                          {getPriorityText(task.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {task.estimated_hours ? formatHours(task.estimated_hours) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {task.actual_hours ? formatHours(task.actual_hours) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {task.calculated_price ? formatCurrency(task.calculated_price) : '—'}
                      </TableCell>
                      <TableCell>
                        {task.due_date ? format(new Date(task.due_date), 'dd.MM.yyyy') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Time Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Detailné časové záznamy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {timeEntries.map(({ taskTitle, timeEntries: entries }) => (
              <div key={taskTitle} className="space-y-3">
                <h3 className="text-lg font-medium text-primary">{taskTitle}</h3>
                {entries.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dátum</TableHead>
                          <TableHead>Používateľ</TableHead>
                          <TableHead className="text-right">Hodiny</TableHead>
                          <TableHead className="text-right">Sadzba</TableHead>
                          <TableHead className="text-right">Suma</TableHead>
                          <TableHead>Poznámka</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {format(new Date(entry.date), 'dd.MM.yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {entry.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                                  </span>
                                </div>
                                <span>{entry.user?.name || 'Neznámy'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatHours(entry.hours)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(entry.hourly_rate)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(entry.amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {entry.description || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Žiadne časové záznamy</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="print:shadow-none">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>Report vygenerovaný dňa {format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
              <p className="mt-1">Layers Task Manager</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
