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

  // Add CSS for better PDF formatting
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          size: A4;
          margin: 10mm;
        }
        @page {
          @top-center {
            content: "Layers - Report";
          }
          @bottom-center {
            content: "Layers";
          }
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

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
    
    // Set document title for PDF filename and header
    const originalTitle = document.title;
    if (project) {
      const safeName = project.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      document.title = `${safeName}-report.pdf`;
    } else {
      document.title = "report.pdf";
    }
    
    // Small delay to ensure styles are applied
    setTimeout(() => {
      window.print();
      
      // Restore original title and remove print mode class after printing
      setTimeout(() => {
        document.title = originalTitle;
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
  const totalPrice = tasks.reduce((sum, task) => {
    // Use budget_cents (fixed price) if available, otherwise use calculated_price
    const price = task.budget_cents ? task.budget_cents / 100 : (task.calculated_price || 0);
    return sum + price;
  }, 0);

  return (
    <div className="space-y-4 min-h-screen bg-background print:bg-white">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-muted-foreground hover:text-foreground hover:bg-accent print:hidden"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Späť
          </Button>
          <div className="h-4 w-px bg-border print:hidden" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground print:hidden">
            <span className="font-medium">{project.name}</span>
            <span>•</span>
            <span className="font-mono text-xs">{project.code}</span>
            <span>•</span>
            <span className="text-muted-foreground">Report</span>
          </div>
        </div>
        
        <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-2 print:hidden">
          <Download className="h-4 w-4" />
          Stiahnuť PDF
        </Button>
      </div>

      {/* Report Content */}
      <div className="space-y-6 print:space-y-2mm">
        {/* Project Header */}
        <div className="space-y-4 print:mb-0">
          <Card className="border border-border shadow-sm print:mb-0">
            <CardContent className="pt-8 pb-6 print:pt-1mm print:pb-1mm">
              <div className="space-y-4 print:space-y-0">
                <div className="flex justify-between items-start print:justify-between">
                  {/* Left side - Project name and code */}
                  <div>
                    <h1 className="text-3xl font-bold print:text-2xl print:mb-0 text-foreground">{project.name}</h1>
                    {project.code && (
                    <p className="mt-1 text-sm text-muted-foreground print:text-xs print:mt-0 print:text-gray-500">{project.code}</p>
                    )}
                  </div>
                  
                  {/* Right side - Client and Date */}
                  <div className="flex gap-6 text-sm print:gap-4">
                    {project.client && (
                    <div className="flex flex-col items-end text-muted-foreground print:items-end">
                      <div className="p-2 bg-muted/50 rounded-lg print:hidden">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="text-right print:text-right mt-2">
                        <p className="text-xs text-muted-foreground">Klient</p>
                        <p className="font-medium text-foreground mt-0.5">{project.client?.name || 'N/A'}</p>
                      </div>
                    </div>
                    )}
                    <div className="flex flex-col items-end text-muted-foreground print:items-end">
                      <div className="p-2 bg-muted/50 rounded-lg print:hidden">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="text-right print:text-right mt-2">
                        <p className="text-xs text-muted-foreground">Dátum</p>
                        <p className="font-medium text-foreground mt-0.5">{format(new Date(), 'dd.MM.yyyy')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid print:grid-cols-3 print:gap-2mm">
            <Card className="border border-border shadow-sm hover:shadow-md transition-shadow print:border-gray-200 print:mb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-0 print:pt-1mm">
                <CardTitle className="text-sm font-semibold text-foreground print:text-2xs print:font-semibold">Úlohy</CardTitle>
                <FileText className="h-5 w-5 text-muted-foreground print:hidden" />
              </CardHeader>
              <CardContent className="print:pt-0 print:pb-1mm">
                <div className="text-3xl font-bold print:text-2xl print:font-bold print:mb-0 text-foreground">{tasks.length}</div>
                <p className="text-xs text-muted-foreground print:text-2xs print:mt-0">Celkový počet úloh</p>
              </CardContent>
            </Card>
            
            <Card className="border border-border shadow-sm hover:shadow-md transition-shadow print:border-gray-200 print:mb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-0 print:pt-1mm">
                <CardTitle className="text-sm font-semibold text-foreground print:text-2xs print:font-semibold">Hodiny</CardTitle>
                <Clock className="h-5 w-5 text-muted-foreground print:hidden" />
              </CardHeader>
              <CardContent className="print:pt-0 print:pb-1mm">
                <div className="text-3xl font-bold print:text-2xl print:font-bold print:mb-0 text-foreground">{formatHours(totalHours)}</div>
                <p className="text-xs text-muted-foreground print:text-2xs print:mt-0">Odpracované hodiny</p>
              </CardContent>
            </Card>
            
            <Card className="border border-border shadow-sm hover:shadow-md transition-shadow print:border-gray-200 print:mb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-0 print:pt-1mm">
                <CardTitle className="text-sm font-semibold text-foreground print:text-2xs print:font-semibold">Cena</CardTitle>
                <Euro className="h-5 w-5 text-muted-foreground print:hidden" />
              </CardHeader>
              <CardContent className="print:pt-0 print:pb-1mm">
                <div className="text-3xl font-bold print:text-2xl print:font-bold print:mb-0 text-foreground">{formatCurrency(totalPrice)}</div>
                <p className="text-xs text-muted-foreground print:text-2xs print:mt-0">Celková cena</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tasks Table */}
        <Card className="border border-border shadow-sm print:border-gray-200 print:mb-0">
          <CardHeader className="print:hidden">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Úlohy a časy
            </CardTitle>
          </CardHeader>
          <CardContent className="print:pt-0 print:pb-1mm">
            <div className="rounded-md border border-border print:border-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[60%] print:w-[60%] print:text-xs print:font-semibold text-foreground">Úloha</TableHead>
                    <TableHead className="w-[20%] text-right print:w-[20%] print:text-right print:text-xs print:font-semibold text-foreground">Hodiny</TableHead>
                    <TableHead className="w-[20%] text-right print:w-[20%] print:text-right print:text-xs print:font-semibold text-foreground">Cena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="print:border-0 hover:bg-muted/30">
                      <TableCell className="font-medium print:text-xs print:font-medium text-foreground">{task.title}</TableCell>
                      <TableCell className="text-right text-sm print:text-xs print:text-right text-foreground">
                        {task.actual_hours ? formatHours(task.actual_hours) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold print:text-xs print:text-right print:font-semibold text-foreground">
                        {task.budget_cents ? formatCurrency(task.budget_cents / 100) : (task.calculated_price ? formatCurrency(task.calculated_price) : '—')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Time Entries */}
        {timeEntries.some(({ timeEntries: entries }) => entries.length > 0) && (
        <Card className="border border-border shadow-sm print:border-gray-200 print:mb-0">
          <CardHeader className="print:hidden">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Detailné časové záznamy
            </CardTitle>
          </CardHeader>
            <CardContent className="space-y-6 print:space-y-2mm print:pt-0 print:pb-1mm">
              {timeEntries
                .filter(({ timeEntries: entries }) => entries.length > 0)
                .map(({ taskTitle, timeEntries: entries }) => (
                  <div key={taskTitle} className="space-y-3 print:space-y-0">
                    <h3 className="text-lg font-medium text-primary print:text-sm print:font-semibold print:text-gray-700 print:mb-0">{taskTitle}</h3>
                    <div className="rounded-md border border-border print:border-0 print:-mt-3mm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[14%] print:w-[14%] print:text-xs print:font-semibold text-foreground">Dátum</TableHead>
                            <TableHead className="w-[18%] print:w-[18%] print:text-xs print:font-semibold text-foreground">Používateľ</TableHead>
                            <TableHead className="w-[30%] print:w-[30%] print:text-xs print:font-semibold text-foreground">Poznámka</TableHead>
                            <TableHead className="w-[12%] text-right print:w-[12%] print:text-right print:text-xs print:font-semibold text-foreground">Hodiny</TableHead>
                            <TableHead className="w-[12%] text-right print:w-[12%] print:text-right print:text-xs print:font-semibold text-foreground">Sadzba</TableHead>
                            <TableHead className="w-[14%] text-right print:w-[14%] print:text-right print:text-xs print:font-semibold text-foreground">Suma</TableHead>
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
                                      {entry.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || entry.user?.email?.charAt(0).toUpperCase() || '?'}
                                    </span>
                                  </div>
                                  <span className="text-sm print:text-xs text-foreground">{entry.user?.name || entry.user?.email || 'Neznámy'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground print:text-xs print:text-gray-600">
                                {entry.description || '—'}
                              </TableCell>
                              <TableCell className="text-right text-sm print:text-xs print:text-right text-foreground">
                                {formatHours(entry.hours)}
                              </TableCell>
                              <TableCell className="text-right text-sm print:text-xs print:text-right text-foreground">
                                {formatCurrency(entry.hourly_rate)}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium print:text-xs print:text-right print:font-semibold text-foreground">
                                {formatCurrency(entry.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="print:hidden">
          <div className="text-center text-sm text-muted-foreground">
            <p>Report vygenerovaný dňa {format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
            <p className="mt-0 font-medium">Layers</p>
          </div>
        </div>
      </div>
    </div>
  );
}
