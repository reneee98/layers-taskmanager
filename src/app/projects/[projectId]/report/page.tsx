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
    // Add print mode class to body
    document.body.classList.add('print-mode');
    
    // Small delay to ensure styles are applied
    setTimeout(() => {
      window.print();
      
      // Remove print mode class after printing
      setTimeout(() => {
        document.body.classList.remove('print-mode');
      }, 1000);
    }, 100);
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'review': 'Review',
      'done': 'Done',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'urgent': 'Urgent'
    };
    return priorityMap[priority] || priority;
  };

  const getStatusBadgeVariant = (status: string) => {
    const variantMap: { [key: string]: string } = {
      'todo': 'bg-muted text-muted-foreground border-border',
      'in_progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'review': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'done': 'bg-green-500/10 text-green-500 border-green-500/20',
      'cancelled': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return variantMap[status] || 'bg-muted text-muted-foreground border-border';
  };

  const getPriorityBadgeVariant = (priority: string) => {
    const variantMap: { [key: string]: string } = {
      'low': 'bg-green-500/10 text-green-500 border-green-500/20',
      'medium': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'high': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'urgent': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return variantMap[priority] || 'bg-muted text-muted-foreground border-border';
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
      {/* Header */}
      <div className="border-b bg-card">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="print:hidden"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Späť na projekt
              </Button>
              <h1 className="text-xl font-semibold text-foreground">{project.name} - Report</h1>
            </div>
            <Button onClick={handleDownloadPDF} className="gap-2 print:hidden">
              <Download className="h-4 w-4" />
              Stiahnuť PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="w-full px-6 py-8 print:py-0 space-y-6 print:space-y-4">
        {/* Project Header */}
        <div className="space-y-4 print:mb-8mm">
          <Card className="border border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center print:text-center space-y-3">
                <div>
                  <h1 className="text-4xl font-bold print:text-2xl print:mb-2mm text-foreground">{project.name}</h1>
                  <Badge variant="outline" className="mt-2 text-base px-3 py-1 print:text-sm print:mb-3mm bg-muted/50 text-muted-foreground">
                    {project.code}
                  </Badge>
                </div>
                <div className="flex justify-center gap-6 text-sm text-muted-foreground print:gap-4 print:text-xs">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-muted rounded-lg">
                      <Users className="h-4 w-4 print:hidden text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-foreground">Klient</p>
                      <p className="text-sm">{project.client?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-muted rounded-lg">
                      <Calendar className="h-4 w-4 print:hidden text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-foreground">Dátum reportu</p>
                      <p className="text-sm">{format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid print:grid-cols-3 print:gap-4mm">
            <Card className="border border-border shadow-sm hover:shadow-md transition-shadow print:border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-1">
                <CardTitle className="text-sm font-semibold text-foreground print:text-xs print:font-semibold">Úlohy</CardTitle>
                <FileText className="h-5 w-5 text-muted-foreground print:hidden" />
              </CardHeader>
              <CardContent className="print:pt-1">
                <div className="text-3xl font-bold print:text-lg print:font-bold print:mb-1mm text-foreground">{tasks.length}</div>
                <p className="text-xs text-muted-foreground print:text-xs">Celkový počet úloh</p>
              </CardContent>
            </Card>
            
            <Card className="border border-border shadow-sm hover:shadow-md transition-shadow print:border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-1">
                <CardTitle className="text-sm font-semibold text-foreground print:text-xs print:font-semibold">Hodiny</CardTitle>
                <Clock className="h-5 w-5 text-muted-foreground print:hidden" />
              </CardHeader>
              <CardContent className="print:pt-1">
                <div className="text-3xl font-bold print:text-lg print:font-bold print:mb-1mm font-mono text-foreground">{formatHours(totalHours)}</div>
                <p className="text-xs text-muted-foreground print:text-xs">Odpracované hodiny</p>
              </CardContent>
            </Card>
            
            <Card className="border border-border shadow-sm hover:shadow-md transition-shadow print:border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-1">
                <CardTitle className="text-sm font-semibold text-foreground print:text-xs print:font-semibold">Cena</CardTitle>
                <Euro className="h-5 w-5 text-muted-foreground print:hidden" />
              </CardHeader>
              <CardContent className="print:pt-1">
                <div className="text-3xl font-bold print:text-lg print:font-bold print:mb-1mm font-mono text-foreground">{formatCurrency(totalPrice)}</div>
                <p className="text-xs text-muted-foreground print:text-xs">Celková cena</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tasks Table */}
        <Card className="border border-border shadow-sm print:border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground print:text-sm print:font-semibold print:text-blue-600">
              <FileText className="h-5 w-5 print:hidden text-muted-foreground" />
              Úlohy a časy
            </CardTitle>
          </CardHeader>
          <CardContent className="print:pt-2">
            <div className="rounded-md border border-border print:border-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50%] print:w-[50%] print:text-xs print:font-semibold text-foreground">Úloha</TableHead>
                    <TableHead className="text-right w-[20%] print:w-[20%] print:text-xs print:font-semibold text-foreground">Odhadené hodiny</TableHead>
                    <TableHead className="text-right w-[20%] print:w-[20%] print:text-xs print:font-semibold text-foreground">Odpracované hodiny</TableHead>
                    <TableHead className="text-right w-[20%] print:w-[20%] print:text-xs print:font-semibold text-foreground">Cena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="print:border-0 hover:bg-muted/30">
                      <TableCell className="font-medium print:text-xs print:font-medium text-foreground">{task.title}</TableCell>
                      <TableCell className="text-right font-mono text-sm print:font-mono print:text-xs print:text-right text-foreground">
                        {task.estimated_hours ? formatHours(task.estimated_hours) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm print:font-mono print:text-xs print:text-right text-foreground">
                        {task.actual_hours ? formatHours(task.actual_hours) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold print:font-mono print:text-xs print:text-right print:font-semibold text-foreground">
                        {task.calculated_price ? formatCurrency(task.calculated_price) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Time Entries */}
        <Card className="border border-border shadow-sm print:border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground print:text-sm print:font-semibold print:text-blue-600">
              <Clock className="h-5 w-5 print:hidden text-muted-foreground" />
              Detailné časové záznamy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 print:space-y-4mm print:pt-2">
            {timeEntries.map(({ taskTitle, timeEntries: entries }) => (
              <div key={taskTitle} className="space-y-3 print:space-y-2mm">
                <h3 className="text-lg font-medium text-primary print:text-sm print:font-semibold print:text-gray-700 print:mb-1mm">{taskTitle}</h3>
                {entries.length > 0 ? (
                  <div className="rounded-md border border-border print:border-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[15%] print:w-[15%] print:text-xs print:font-semibold text-foreground">Dátum</TableHead>
                          <TableHead className="w-[20%] print:w-[20%] print:text-xs print:font-semibold text-foreground">Používateľ</TableHead>
                          <TableHead className="text-right w-[12%] print:w-[12%] print:text-xs print:font-semibold text-foreground">Hodiny</TableHead>
                          <TableHead className="text-right w-[12%] print:w-[12%] print:text-xs print:font-semibold text-foreground">Sadzba</TableHead>
                          <TableHead className="text-right w-[12%] print:w-[12%] print:text-xs print:font-semibold text-foreground">Suma</TableHead>
                          <TableHead className="w-[29%] print:w-[29%] print:text-xs print:font-semibold text-foreground">Poznámka</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry: any) => (
                          <TableRow key={entry.id} className="print:border-0 hover:bg-muted/30">
                            <TableCell className="text-sm print:text-xs text-foreground">
                              {format(new Date(entry.date), 'dd.MM.yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center print:hidden">
                                  <span className="text-xs font-medium">
                                    {entry.user?.display_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                                  </span>
                                </div>
                                <span className="text-sm print:text-xs text-foreground">{entry.user?.display_name || 'Neznámy'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm print:font-mono print:text-xs print:text-right text-foreground">
                              {formatHours(entry.hours)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm print:font-mono print:text-xs print:text-right text-foreground">
                              {formatCurrency(entry.hourly_rate)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-medium print:font-mono print:text-xs print:text-right print:font-semibold text-foreground">
                              {formatCurrency(entry.amount)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground print:text-xs print:text-gray-600">
                              {entry.description || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground print:text-gray-600 print:py-4mm">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50 print:hidden" />
                    <p className="print:text-xs">Žiadne časové záznamy</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="print:mt-8mm print:pt-4mm print:border-t print:border-gray-200">
          <div className="text-center text-sm text-muted-foreground print:text-xs print:text-gray-500">
            <p>Report vygenerovaný dňa {format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
            <p className="mt-1 font-medium print:text-xs">Laydo - Alpha verzia 1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
