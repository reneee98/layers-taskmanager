"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Loader2, Clock, Euro, Users, FileText, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatHours } from "@/lib/format";
import { getTaskStatusLabel } from "@/lib/task-status";
import { usePermission } from "@/hooks/usePermissions";
import { format } from "date-fns";
import type { Project, Task } from "@/types/database";
import pdfMake from "pdfmake/build/pdfmake";

// Dynamically import fonts
let fontsInitialized = false;

const initializeFonts = async () => {
  if (fontsInitialized) return;
  
  try {
    // Try different import methods for Next.js
    const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
    
    // The vfs_fonts.js file exports vfs object
    // Check various possible export formats
    if ((pdfFontsModule as any).default?.vfs) {
      pdfMake.vfs = (pdfFontsModule as any).default.vfs;
      fontsInitialized = true;
    } else if ((pdfFontsModule as any).default?.pdfMake?.vfs) {
      pdfMake.vfs = (pdfFontsModule as any).default.pdfMake.vfs;
      fontsInitialized = true;
    } else if ((pdfFontsModule as any).vfs) {
      pdfMake.vfs = (pdfFontsModule as any).vfs;
      fontsInitialized = true;
    } else if ((pdfFontsModule as any).default) {
      // Default export might be the vfs itself
      pdfMake.vfs = (pdfFontsModule as any).default;
      fontsInitialized = true;
    } else {
      // Try to use the module itself as vfs
      pdfMake.vfs = pdfFontsModule as any;
      fontsInitialized = true;
    }
  } catch (error) {
    console.error("Error loading pdfmake fonts:", error);
    // Try to continue without fonts (may cause issues but won't crash)
  }
};

export default function ProjectReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  
  // Read query parameters with defaults
  const onlyDone = searchParams.get("onlyDone") !== "false"; // default true
  const showSummary = searchParams.get("showSummary") !== "false"; // default true
  const showTasksTable = searchParams.get("showTasksTable") !== "false"; // default true
  const showTimeEntries = searchParams.get("showTimeEntries") !== "false"; // default true
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  /** Task IDs for which hours (and time entries) should be hidden in the generated PDF */
  const [taskIdsHideHoursInPdf, setTaskIdsHideHoursInPdf] = useState<Record<string, boolean>>({});
  const { hasPermission: canViewPrices } = usePermission('financial', 'view_prices');

  const handleToggleHideHoursInPdf = (taskId: string, hide: boolean) => {
    setTaskIdsHideHoursInPdf((prev) => ({ ...prev, [taskId]: hide }));
  };

  // Add CSS for better PDF formatting
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          size: A4;
          margin: 10mm;
          orphans: 2;
          widows: 2;
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
        /* Remove backgrounds from cards and other elements */
        [class*="bg-"],
        [class*="bg-card"],
        [class*="bg-muted"],
        [class*="bg-background"],
        .bg-muted\\/50,
        .bg-muted\\/30 {
          background: transparent !important;
          background-color: transparent !important;
        }
        /* Remove shadows */
        [class*="shadow"] {
          box-shadow: none !important;
        }
        /* Ensure borders are visible */
        [class*="border"] {
          border-color: #e5e7eb !important;
        }
        /* Keep rounded corners in PDF - ensure border-radius is preserved */
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        [class*="rounded-lg"],
        [class*="rounded-md"],
        [class*="rounded"] {
          border-radius: 0.5rem !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        /* Force rounded corners on all cards - use visible to prevent clipping */
        div[class*="Card"],
        div[class*="card"],
        [data-card] {
          border-radius: 0.5rem !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        /* Ensure card borders respect rounded corners */
        div[class*="Card"][class*="border"],
        div[class*="card"][class*="border"] {
          border-radius: 0.5rem !important;
        }
        /* Prevent empty pages - remove excessive spacing */
        html, body {
          height: auto !important;
        }
        /* Remove large bottom margins that cause empty pages */
        body > div:last-child,
        body > div:last-child > div:last-child {
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
          page-break-after: avoid !important;
        }
        /* Allow page breaks in tables but keep rows together */
        table {
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        thead {
          display: table-header-group;
        }
        tfoot {
          display: table-footer-group;
        }
        /* Prevent page breaks in cards */
        [class*="Card"],
        [class*="card"] {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        /* Reduce spacing to prevent empty pages */
        .space-y-6 > * + * {
          margin-top: 0.75rem !important;
        }
        .space-y-4 > * + * {
          margin-top: 0.5rem !important;
        }
        .space-y-2mm > * + * {
          margin-top: 1.5mm !important;
        }
        /* Remove excessive margins on last elements */
        .space-y-6:last-child,
        .space-y-4:last-child,
        .space-y-2mm:last-child {
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
        /* Prevent orphans and widows */
        p, h1, h2, h3, h4, h5, h6 {
          orphans: 2;
          widows: 2;
        }
        /* Suppress empty pages at end */
        @page :blank {
          @top-center { content: ""; }
          @bottom-center { content: ""; }
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch project
        const projectResponse = await fetch(`/api/projects/${projectId}`);
        const projectResult = await projectResponse.json();
        if (projectResult.success) {
          setProject(projectResult.data);
        }

        // Fetch tasks - filter based on onlyDone parameter
        const tasksResponse = await fetch(`/api/tasks?project_id=${projectId}`);
        const tasksResult = await tasksResponse.json();
        let filteredTasks: Task[] = [];
        if (tasksResult.success) {
          // Filter tasks based on onlyDone parameter
          if (onlyDone) {
            filteredTasks = (tasksResult.data || []).filter((task: Task) => task.status === "done");
          } else {
            filteredTasks = tasksResult.data || [];
          }
          setTasks(filteredTasks);
        }

        // Fetch time entries for filtered tasks
        const timeEntriesData = await Promise.all(
          filteredTasks.map(async (task: Task) => {
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

    fetchData();
  }, [projectId, onlyDone]);

  const handleDownloadPDF = async () => {
    if (!project) return;
    
    setIsGeneratingPDF(true);
    
    // Initialize fonts if not already done
    await initializeFonts();
    
    try {
      const safeName = project.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      const filename = `${safeName}-report.pdf`;
      
      // Build PDF document
      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [12, 12, 12, 12],
        content: [],
        styles: {
          header: {
            fontSize: 20,
            bold: true,
            color: '#000000',
            margin: [0, 0, 0, 2]
          },
          subheader: {
            fontSize: 10,
            color: '#666666',
            margin: [0, 0, 0, 6]
          },
          infoLabel: {
            fontSize: 8,
            color: '#666666',
            margin: [0, 0, 0, 1]
          },
          infoValue: {
            fontSize: 10,
            color: '#000000',
            margin: [0, 0, 0, 0]
          },
          cardTitle: {
            fontSize: 8,
            bold: true,
            color: '#666666',
            margin: [0, 0, 0, 2]
          },
          cardValue: {
            fontSize: 18,
            bold: true,
            color: '#000000',
            margin: [0, 0, 0, 2]
          },
          cardSubtitle: {
            fontSize: 7,
            color: '#666666',
            margin: [0, 0, 0, 0]
          },
          sectionTitle: {
            fontSize: 11,
            bold: true,
            color: '#000000',
            margin: [0, 0, 0, 4]
          },
          tableHeader: {
            fontSize: 9,
            bold: true,
            color: '#374151',
            fillColor: '#f9fafb'
          },
          tableCell: {
            fontSize: 10,
            color: '#000000'
          },
          footer: {
            fontSize: 7,
            color: '#666666',
            alignment: 'center'
          }
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 10,
          color: '#000000'
        }
      };

      // Header
      docDefinition.content.push({
        columns: [
          {
            stack: [
              {
                text: project.name,
                style: 'header'
              },
              project.code ? {
                text: project.code,
                style: 'subheader'
              } : null
            ].filter(Boolean),
            width: '*'
          },
          {
            stack: [
              project.client ? {
                stack: [
                  { text: 'Klient', style: 'infoLabel' },
                  { text: project.client.name || 'N/A', style: 'infoValue' }
                ],
                margin: [0, 0, 0, 4]
              } : null,
              {
                stack: [
                  { text: 'Dátum', style: 'infoLabel' },
                  { text: format(new Date(), 'dd.MM.yyyy'), style: 'infoValue' }
                ]
              }
            ].filter(Boolean),
            width: 'auto',
            alignment: 'right',
            border: [true, true, true, true],
            borderColor: '#e5e7eb',
            borderRadius: 6,
            fillColor: '#ffffff',
            padding: [8, 8, 8, 8]
          }
        ],
        margin: [0, 0, 0, 10]
      });

      // PDF totals: hours only from tasks that show hours; price from all tasks
      const tasksVisibleHoursInPdf = tasks.filter((t) => !taskIdsHideHoursInPdf[t.id]);
      const pdfTotalHours = tasksVisibleHoursInPdf.reduce((sum, t) => sum + (t.actual_hours || 0), 0);

      // Summary cards
      if (showSummary) {
        docDefinition.content.push({
          columns: [
            {
              stack: [
                { text: 'Úlohy', style: 'cardTitle' },
                { text: `${tasks.length}`, style: 'cardValue' },
                { text: 'Celkový počet úloh', style: 'cardSubtitle' }
              ],
              border: [true, true, true, true],
              borderColor: '#e5e7eb',
              borderRadius: 6,
              margin: [0, 0, 6, 8],
              fillColor: '#ffffff',
              padding: [8, 8, 8, 8]
            },
            {
              stack: [
                { text: 'Hodiny', style: 'cardTitle' },
                { text: formatHours(pdfTotalHours), style: 'cardValue' },
                { text: 'Odpracované hodiny', style: 'cardSubtitle' }
              ],
              border: [true, true, true, true],
              borderColor: '#e5e7eb',
              borderRadius: 6,
              margin: [0, 0, 6, 8],
              fillColor: '#ffffff',
              padding: [8, 8, 8, 8]
            },
            {
              stack: [
                { text: 'Cena', style: 'cardTitle' },
                { text: formatCurrency(totalPrice), style: 'cardValue' },
                { text: 'Celková cena', style: 'cardSubtitle' }
              ],
              border: [true, true, true, true],
              borderColor: '#e5e7eb',
              borderRadius: 6,
              margin: [0, 0, 0, 8],
              fillColor: '#ffffff',
              padding: [8, 8, 8, 8]
            }
          ],
          columnGap: 0
        });
      }

      // Tasks table
      if (showTasksTable && tasks.length > 0) {
        const tasksTableBody: any[] = [
          [
            { text: 'Úloha', style: 'tableHeader' },
            { text: 'Hodiny', style: 'tableHeader', alignment: 'right' },
            { text: 'Cena', style: 'tableHeader', alignment: 'right' }
          ]
        ];

        tasks.forEach((task) => {
          const hideHours = !!taskIdsHideHoursInPdf[task.id];
          tasksTableBody.push([
            { text: task.title, style: 'tableCell' },
            { 
              text: hideHours ? '—' : (task.actual_hours ? formatHours(task.actual_hours) : '—'), 
              style: 'tableCell', 
              alignment: 'right' 
            },
            { 
              text: task.budget_cents 
                ? formatCurrency(task.budget_cents / 100) 
                : (task.calculated_price ? formatCurrency(task.calculated_price) : '—'), 
              style: 'tableCell', 
              alignment: 'right'
            }
          ]);
        });

        docDefinition.content.push({
          text: 'Úlohy a časy',
          style: 'sectionTitle'
        });

        docDefinition.content.push({
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto'],
            body: tasksTableBody
          },
          layout: {
            hLineWidth: (i: number) => i === 0 || i === tasksTableBody.length ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#e5e7eb',
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6
          },
          margin: [0, 0, 0, 10]
        });
      }

      // Time entries (only for tasks that don't have "hide hours in PDF" toggled)
      if (showTimeEntries && timeEntries.some(({ timeEntries: entries }) => entries.length > 0)) {
        timeEntries
          .filter(({ taskId, timeEntries: entries }) => entries.length > 0 && !taskIdsHideHoursInPdf[taskId])
          .forEach(({ taskTitle, timeEntries: entries }) => {
            docDefinition.content.push({
              text: taskTitle,
              style: 'sectionTitle',
              margin: [0, 6, 0, 4]
            });

            const timeTableBody: any[] = [
              [
                { text: 'Dátum', style: 'tableHeader' },
                { text: 'Používateľ', style: 'tableHeader' },
                { text: 'Poznámka', style: 'tableHeader' },
                { text: 'Hodiny', style: 'tableHeader', alignment: 'right' },
                { text: 'Sadzba', style: 'tableHeader', alignment: 'right' },
                { text: 'Suma', style: 'tableHeader', alignment: 'right' }
              ]
            ];

            entries.forEach((entry: any) => {
              timeTableBody.push([
                { text: format(new Date(entry.date), 'dd.MM.yyyy'), style: 'tableCell' },
                { text: entry.user?.name || entry.user?.email || 'Neznámy', style: 'tableCell' },
                { text: entry.description || '—', style: 'tableCell', color: '#666666' },
                { text: formatHours(entry.hours), style: 'tableCell', alignment: 'right' },
                { text: formatCurrency(entry.hourly_rate), style: 'tableCell', alignment: 'right' },
                { text: formatCurrency(entry.amount), style: 'tableCell', alignment: 'right' }
              ]);
            });

            docDefinition.content.push({
              table: {
                headerRows: 1,
                widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto'],
                body: timeTableBody
              },
              layout: {
                hLineWidth: (i: number) => i === 0 || i === timeTableBody.length ? 1 : 0.5,
                vLineWidth: () => 0,
                hLineColor: () => '#e5e7eb',
                paddingLeft: () => 8,
                paddingRight: () => 8,
                paddingTop: () => 6,
                paddingBottom: () => 6
              },
              margin: [0, 0, 0, 10]
            });
          });
      }

      // Footer
      docDefinition.content.push({
        stack: [
          {
            text: `Report vygenerovaný dňa ${format(new Date(), 'dd.MM.yyyy HH:mm')}`,
            style: 'footer',
            margin: [0, 0, 0, 2]
          },
          {
            text: 'Layers',
            style: 'footer'
          }
        ],
        margin: [0, 10, 0, 0]
      });

      // Generate and download PDF
      pdfMake.createPdf(docDefinition).download(filename);
      
      toast({
        title: "Úspech",
        description: "PDF bol úspešne vygenerovaný",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vygenerovať PDF",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getStatusText = (status: string) => {
    return getTaskStatusLabel(status) || status;
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
      <div className="flex items-center justify-between print:hidden">
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
        
        <Button 
          onClick={handleDownloadPDF} 
          variant="outline" 
          size="sm" 
          className="gap-2 print:hidden"
          disabled={isGeneratingPDF}
        >
          {isGeneratingPDF ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generujem PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Stiahnuť PDF
            </>
          )}
        </Button>
      </div>

      {/* Report Content */}
      <div className="space-y-6 print:space-y-2mm">
        {/* Project Header */}
        <div className="space-y-4 print:mb-0">
          <Card className="border border-border shadow-sm print:mb-0 print:bg-transparent print:shadow-none print:rounded-lg">
            <CardContent className="pt-8 pb-6 print:pt-1mm print:pb-1mm print:bg-transparent">
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
          {showSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid print:grid-cols-3 print:gap-2mm">
            <Card className="border border-border shadow-sm hover:shadow-md transition-shadow print:border-gray-200 print:mb-0 print:bg-transparent print:shadow-none print:rounded-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-0 print:pt-1mm print:bg-transparent">
                <CardTitle className="text-sm font-semibold text-foreground print:text-2xs print:font-semibold">Úlohy</CardTitle>
                <FileText className="h-5 w-5 text-muted-foreground print:hidden" />
              </CardHeader>
              <CardContent className="print:pt-0 print:pb-1mm print:bg-transparent">
                <div className="text-3xl font-bold print:text-2xl print:font-bold print:mb-0 text-foreground">{tasks.length}</div>
                <p className="text-xs text-muted-foreground print:text-2xs print:mt-0">Celkový počet úloh</p>
              </CardContent>
            </Card>
            
            <Card className="border border-border shadow-sm hover:shadow-md transition-shadow print:border-gray-200 print:mb-0 print:bg-transparent print:shadow-none print:rounded-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-0 print:pt-1mm print:bg-transparent">
                <CardTitle className="text-sm font-semibold text-foreground print:text-2xs print:font-semibold">Hodiny</CardTitle>
                <Clock className="h-5 w-5 text-muted-foreground print:hidden" />
              </CardHeader>
              <CardContent className="print:pt-0 print:pb-1mm print:bg-transparent">
                <div className="text-3xl font-bold print:text-2xl print:font-bold print:mb-0 text-foreground">{formatHours(totalHours)}</div>
                <p className="text-xs text-muted-foreground print:text-2xs print:mt-0">Odpracované hodiny</p>
              </CardContent>
            </Card>
            
            {canViewPrices && (
              <Card className="border border-border shadow-sm hover:shadow-md transition-shadow print:border-gray-200 print:mb-0 print:bg-transparent print:shadow-none print:rounded-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-0 print:pt-1mm print:bg-transparent">
                  <CardTitle className="text-sm font-semibold text-foreground print:text-2xs print:font-semibold">Cena</CardTitle>
                  <Euro className="h-5 w-5 text-muted-foreground print:hidden" />
                </CardHeader>
                <CardContent className="print:pt-0 print:pb-1mm print:bg-transparent">
                  <div className="text-3xl font-bold print:text-2xl print:font-bold print:mb-0 text-foreground">{formatCurrency(totalPrice)}</div>
                  <p className="text-xs text-muted-foreground print:text-2xs print:mt-0">Celková cena</p>
                </CardContent>
              </Card>
            )}
          </div>
          )}
        </div>

        {/* Tasks Table */}
        {showTasksTable && (
        <Card className="border border-border shadow-sm print:border-gray-200 print:mb-0 print:bg-transparent print:shadow-none print:rounded-lg">
          <CardHeader className="print:hidden print:bg-transparent">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Úlohy a časy
            </CardTitle>
          </CardHeader>
          <CardContent className="print:pt-0 print:pb-1mm print:bg-transparent">
            <div className="rounded-md border border-border print:border-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 print:bg-transparent">
                    <TableHead className="w-[50%] print:w-[60%] print:text-xs print:font-semibold text-foreground">Úloha</TableHead>
                    <TableHead className="w-[18%] text-right print:w-[20%] print:text-right print:text-xs print:font-semibold text-foreground">Hodiny</TableHead>
                    <TableHead className="w-[18%] text-right print:w-[20%] print:text-right print:text-xs print:font-semibold text-foreground">Cena</TableHead>
                    <TableHead className="w-[14%] print:hidden text-left text-xs font-semibold text-foreground">V PDF skryť hodiny</TableHead>
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
                      <TableCell className="print:hidden">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`hide-hours-${task.id}`}
                            checked={!!taskIdsHideHoursInPdf[task.id]}
                            onCheckedChange={(checked) => handleToggleHideHoursInPdf(task.id, checked)}
                            aria-label={`Skryť hodiny úlohy "${task.title}" v PDF`}
                          />
                          <Label
                            htmlFor={`hide-hours-${task.id}`}
                            className="text-xs text-muted-foreground cursor-pointer"
                          >
                            {taskIdsHideHoursInPdf[task.id] ? "Skryté" : "Zobraziť"}
                          </Label>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Time Entries */}
        {showTimeEntries && timeEntries.some(({ timeEntries: entries }) => entries.length > 0) && (
        <Card className="border border-border shadow-sm print:border-gray-200 print:mb-0 print:bg-transparent print:shadow-none print:rounded-lg">
          <CardHeader className="print:hidden print:bg-transparent">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Detailné časové záznamy
            </CardTitle>
          </CardHeader>
            <CardContent className="space-y-6 print:space-y-2mm print:pt-0 print:pb-1mm print:bg-transparent">
              {timeEntries
                .filter(({ timeEntries: entries }) => entries.length > 0)
                .map(({ taskTitle, timeEntries: entries }) => (
                  <div key={taskTitle} className="space-y-3 print:space-y-0">
                    <h3 className="text-lg font-medium text-primary print:text-sm print:font-semibold print:text-gray-700 print:mb-0">{taskTitle}</h3>
                    <div className="rounded-md border border-border print:border-0 print:-mt-3mm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 print:bg-transparent">
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
