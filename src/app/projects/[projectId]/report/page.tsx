"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BarChart3,
  Clock3,
  Download,
  FileClock,
  Layers3,
  ListChecks,
  Loader2,
  ReceiptText,
} from "lucide-react";
import pdfMake from "pdfmake/build/pdfmake";

import { MetricStrip, type MetricStripItem } from "@/components/layout/metric-strip";
import { PageHeader } from "@/components/layout/page-header";
import { PageState } from "@/components/layout/page-state";
import { ProjectReportAnalytics } from "@/components/report/ProjectReportAnalytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermissions";
import { normalizeCurrency } from "@/lib/currency";
import { formatCurrency, formatHours } from "@/lib/format";
import {
  groupReportTimeEntriesByDescription,
  type TaskTimeEntriesForReport,
} from "@/lib/report-time-entry-groups";
import { getTaskStatusLabel } from "@/lib/task-status";
import { resolveTaskColor, taskColorToRgba } from "@/lib/task-colors";
import { cn } from "@/lib/utils";
import type { Project, Task } from "@/types/database";

let fontsInitialized = false;

const initializeFonts = async () => {
  if (fontsInitialized) return;

  try {
    const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

    // pdfmake ships multiple module shapes across bundlers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fontModule = pdfFontsModule as any;
    const vfs =
      fontModule.default?.vfs ||
      fontModule.default?.pdfMake?.vfs ||
      fontModule.vfs ||
      fontModule.default;

    if (vfs) {
      pdfMake.vfs = vfs;
      fontsInitialized = true;
    }
  } catch (error) {
    console.error("Error loading pdfmake fonts:", error);
  }
};

type PdfContent = Record<string, unknown>;

const PDF_COLORS = {
  ink: "#171717",
  inkSoft: "#3F4743",
  muted: "#737373",
  subtle: "#A3A3A3",
  border: "#E5E5E5",
  borderStrong: "#D7DDD9",
  panel: "#F6F8F7",
  zebra: "#FBFBFA",
  white: "#FFFFFF",
  brand: "#39765B",
  brandDark: "#285540",
  brandSoft: "#EAF3EE",
};

const PDF_STATUS_COLORS: Record<string, string> = {
  todo: "#94A3B8",
  in_progress: "#4F83CC",
  review: "#D49A35",
  sent_to_client: "#87779D",
  done: "#4F8A6B",
  invoiced: "#3F8C85",
  cancelled: "#C56868",
};

const STATUS_TONES: Record<string, string> = {
  todo: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  in_progress:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
  review:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  sent_to_client:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  invoiced:
    "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300",
};

const getTaskPrice = (task: Task) =>
  task.budget_cents ? task.budget_cents / 100 : task.calculated_price || 0;

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getTaskEntryHours = (entries: TaskTimeEntriesForReport["timeEntries"]) =>
  entries.reduce((sum, entry) => sum + entry.hours, 0);

interface PdfDonutSegment {
  label: string;
  value: number;
  color: string;
}

const escapeSvgText = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const getDonutPoint = (radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: 76 + radius * Math.cos(radians),
    y: 76 + radius * Math.sin(radians),
  };
};

const createDonutSegmentPath = (startAngle: number, endAngle: number) => {
  const outerRadius = 58;
  const innerRadius = 36;
  const outerStart = getDonutPoint(outerRadius, startAngle);
  const outerEnd = getDonutPoint(outerRadius, endAngle);
  const innerStart = getDonutPoint(innerRadius, startAngle);
  const innerEnd = getDonutPoint(innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  const point = (value: number) => value.toFixed(2);

  return [
    `M ${point(outerStart.x)} ${point(outerStart.y)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${point(outerEnd.x)} ${point(outerEnd.y)}`,
    `L ${point(innerEnd.x)} ${point(innerEnd.y)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${point(innerStart.x)} ${point(innerStart.y)}`,
    "Z",
  ].join(" ");
};

const createPdfDonutSvg = (
  segments: PdfDonutSegment[],
  centerValue: string,
  centerLabel: string
) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let currentAngle = 0;

  const paths = segments
    .map((segment) => {
      const sweep = total > 0 ? (segment.value / total) * 360 : 0;
      const gap = segments.length > 1 ? Math.min(1.8, sweep * 0.18) : 0;
      const startAngle = currentAngle + gap / 2;
      const endAngle = currentAngle + sweep - gap / 2;
      currentAngle += sweep;

      if (segments.length === 1) {
        return `<circle cx="76" cy="76" r="47" fill="none" stroke="${segment.color}" stroke-width="22" />`;
      }

      return `<path d="${createDonutSegmentPath(startAngle, endAngle)}" fill="${segment.color}" />`;
    })
    .join("");

  return [
    '<svg width="152" height="152" viewBox="0 0 152 152" xmlns="http://www.w3.org/2000/svg">',
    '<circle cx="76" cy="76" r="58" fill="#F6F8F7" />',
    paths,
    '<circle cx="76" cy="76" r="34" fill="#FFFFFF" />',
    `<text x="76" y="73" text-anchor="middle" font-family="Roboto" font-size="15" font-weight="700" fill="${PDF_COLORS.ink}">${escapeSvgText(centerValue)}</text>`,
    `<text x="76" y="89" text-anchor="middle" font-family="Roboto" font-size="6.5" fill="${PDF_COLORS.muted}">${escapeSvgText(centerLabel)}</text>`,
    "</svg>",
  ].join("");
};

interface ReportPanelHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  meta?: ReactNode;
}

const ReportPanelHeader = ({ icon: Icon, title, description, meta }: ReportPanelHeaderProps) => (
  <header className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
        <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    {meta}
  </header>
);

const TaskStatusBadge = ({ status }: { status: string }) => (
  <Badge
    variant="outline"
    className={cn(
      "whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium",
      STATUS_TONES[status]
    )}
  >
    {getTaskStatusLabel(status)}
  </Badge>
);

const createPdfTableLayout = () => ({
  hLineWidth: (rowIndex: number) => (rowIndex === 0 ? 0 : 0.55),
  vLineWidth: () => 0,
  hLineColor: () => PDF_COLORS.border,
  fillColor: (rowIndex: number) =>
    rowIndex === 0 ? PDF_COLORS.brandSoft : rowIndex % 2 === 0 ? PDF_COLORS.zebra : null,
  paddingLeft: () => 9,
  paddingRight: () => 9,
  paddingTop: (rowIndex: number) => (rowIndex === 0 ? 7 : 8),
  paddingBottom: (rowIndex: number) => (rowIndex === 0 ? 7 : 8),
});

const createPdfSectionHeader = (title: string, meta?: string): PdfContent => ({
  columns: [
    { text: title, style: "sectionTitle" },
    meta ? { text: meta, style: "sectionMeta", alignment: "right" } : {},
  ],
  margin: [0, 20, 0, 8],
});

export default function ProjectReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const onlyDone = searchParams.get("onlyDone") !== "false";
  const showSummary = searchParams.get("showSummary") !== "false";
  const showTasksTable = searchParams.get("showTasksTable") !== "false";
  const showTimeEntries = searchParams.get("showTimeEntries") !== "false";
  const showPrices = searchParams.get("showPrices") !== "false";
  const selectedTaskIdsParam = searchParams.get("taskIds");

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TaskTimeEntriesForReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [includePricesInPdf, setIncludePricesInPdf] = useState(showPrices);
  const [taskIdsHideHoursInPdf, setTaskIdsHideHoursInPdf] = useState<Record<string, boolean>>({});
  const { hasPermission: canViewPrices } = usePermission("financial", "view_prices");
  const { hasPermission: canViewHourlyRates } = usePermission("financial", "view_hourly_rates");
  const { toast } = useToast();

  const showPricesInReport = canViewPrices && showPrices;
  const showHourlyRatesInReport = canViewHourlyRates && showPrices;
  const canIncludePricesInPdf = canViewPrices && includePricesInPdf;
  const canIncludeHourlyRatesInPdf = canViewHourlyRates && includePricesInPdf;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        const [projectResponse, tasksResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/tasks?project_id=${projectId}`),
        ]);
        const [projectResult, tasksResult] = await Promise.all([
          projectResponse.json(),
          tasksResponse.json(),
        ]);

        if (projectResult.success) {
          setProject(projectResult.data);
        }

        let filteredTasks: Task[] = [];

        if (tasksResult.success) {
          const selectedTaskIds =
            selectedTaskIdsParam === null
              ? null
              : new Set(selectedTaskIdsParam.split(",").filter(Boolean));
          const projectTasks: Task[] = tasksResult.data || [];

          filteredTasks = onlyDone
            ? projectTasks.filter((task) => task.status === "done" || task.status === "invoiced")
            : projectTasks;

          if (selectedTaskIds) {
            filteredTasks = filteredTasks.filter((task) => selectedTaskIds.has(task.id));
          }

          setTasks(filteredTasks);
        }

        const timeEntriesData = await Promise.all(
          filteredTasks.map(async (task) => {
            const response = await fetch(`/api/tasks/${task.id}/time`);
            const result = await response.json();

            return {
              taskId: task.id,
              taskTitle: task.title,
              timeEntries: result.success ? result.data : [],
            };
          })
        );

        setTimeEntries(timeEntriesData);
      } catch (error) {
        console.error("Error fetching report data:", error);
        toast({
          title: "Chyba",
          description: "Nepodarilo sa načítať dáta pre report",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [onlyDone, projectId, selectedTaskIdsParam, toast]);

  const handleToggleHideHoursInPdf = (taskId: string, hide: boolean) => {
    setTaskIdsHideHoursInPdf((current) => ({ ...current, [taskId]: hide }));
  };

  if (isLoading) {
    return <PageState variant="loading" title="Načítavam projektový report" />;
  }

  if (!project) {
    return (
      <PageState
        variant="error"
        title="Projekt nebol nájdený"
        description="Projekt mohol byť odstránený alebo k nemu nemáte prístup."
      />
    );
  }

  const reportCurrency = normalizeCurrency(project.currency);
  const formatMoney = (value: number) => formatCurrency(value, reportCurrency);
  const totalHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
  const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
  const totalPrice = tasks.reduce((sum, task) => sum + getTaskPrice(task), 0);
  const completedTaskCount = tasks.filter(
    (task) => task.status === "done" || task.status === "invoiced"
  ).length;
  const estimateUsagePercent =
    totalEstimatedHours > 0 ? Math.round((totalHours / totalEstimatedHours) * 100) : 0;
  const timeEntryGroups = groupReportTimeEntriesByDescription(timeEntries);
  const totalEntryCount = timeEntries.reduce(
    (sum, taskEntries) => sum + taskEntries.timeEntries.length,
    0
  );
  const hasTimeEntries = totalEntryCount > 0;
  const generatedAt = new Date();

  const metricItems: MetricStripItem[] = [
    {
      label: "Vybrané úlohy",
      value: tasks.length,
      description: `${completedTaskCount} dokončených`,
      icon: ListChecks,
    },
    {
      label: "Odpracovaný čas",
      value: formatHours(totalHours),
      description:
        totalEstimatedHours > 0
          ? `${estimateUsagePercent} % z odhadu`
          : `${totalEntryCount} časových záznamov`,
      icon: Clock3,
    },
    {
      label: "Typy práce",
      value: timeEntryGroups.length,
      description: "Zoskupené podľa poznámky",
      icon: Layers3,
    },
  ];

  if (showPricesInReport) {
    metricItems.push({
      label: "Hodnota reportu",
      value: formatMoney(totalPrice),
      description: `Mena ${reportCurrency}`,
      icon: ReceiptText,
      tone: "text-emerald-600 dark:text-emerald-400",
    });
  }

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    await initializeFonts();

    try {
      const safeName = project.name.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
      const filename = `${safeName}-report.pdf`;
      const visibleTasksInPdf = tasks.filter((task) => !taskIdsHideHoursInPdf[task.id]);
      const visibleTimeEntriesInPdf = timeEntries.filter(
        ({ taskId }) => !taskIdsHideHoursInPdf[taskId]
      );
      const timeEntryGroupsInPdf = groupReportTimeEntriesByDescription(visibleTimeEntriesInPdf);
      const pdfTotalHours = visibleTasksInPdf.reduce(
        (sum, task) => sum + (task.actual_hours || 0),
        0
      );
      const pdfTotalEntryCount = visibleTimeEntriesInPdf.reduce(
        (sum, item) => sum + item.timeEntries.length,
        0
      );
      const taskTimeSegments = visibleTasksInPdf
        .map((task) => ({
          label: task.title,
          value: task.actual_hours || 0,
          color: resolveTaskColor(task) || PDF_COLORS.brand,
        }))
        .sort((a, b) => b.value - a.value);
      const taskTimeChartSegments = taskTimeSegments.filter((segment) => segment.value > 0);

      let donutTitle = "Rozdelenie odpracovaného času";
      let donutMeta = `${formatHours(pdfTotalHours)} celkom`;
      let donutCenterValue = formatHours(pdfTotalHours);
      let donutCenterLabel = "odpracované";
      let donutSegments: PdfDonutSegment[] = [];
      let donutLegendSegments: PdfDonutSegment[] = [];

      if (taskTimeChartSegments.length > 0) {
        donutSegments = taskTimeChartSegments;
        donutLegendSegments = taskTimeSegments;
      } else if (visibleTasksInPdf.length > 0) {
        const taskCountsByStatus = visibleTasksInPdf.reduce<Record<string, number>>(
          (counts, task) => ({ ...counts, [task.status]: (counts[task.status] || 0) + 1 }),
          {}
        );

        donutTitle = "Rozdelenie úloh podľa statusu";
        donutMeta = `${visibleTasksInPdf.length} úloh celkom`;
        donutCenterValue = `${visibleTasksInPdf.length}`;
        donutCenterLabel = "úloh spolu";
        donutSegments = Object.entries(taskCountsByStatus).map(([status, count]) => ({
          label: getTaskStatusLabel(status),
          value: count,
          color: PDF_STATUS_COLORS[status] || PDF_COLORS.subtle,
        }));
        donutLegendSegments = donutSegments;
      }
      const pdfContent: PdfContent[] = [];

      pdfContent.push(
        {
          columns: [
            {
              text: [
                { text: "LAYERS", bold: true, color: PDF_COLORS.brandDark },
                { text: "  /  PROJEKTOVÝ REPORT", color: PDF_COLORS.muted },
              ],
              fontSize: 7.5,
              characterSpacing: 1,
            },
            {
              text: format(generatedAt, "dd.MM.yyyy '•' HH:mm"),
              alignment: "right",
              color: PDF_COLORS.muted,
              fontSize: 7.5,
            },
          ],
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            widths: ["*", 150],
            body: [
              [
                {
                  stack: [
                    { text: "PROJEKTOVÝ REPORT", style: "eyebrow" },
                    { text: project.name, style: "reportTitle" },
                    {
                      text: `${tasks.length} vybraných úloh • ${formatHours(pdfTotalHours)} odpracovaných`,
                      style: "reportMeta",
                      margin: [0, 6, 0, 0],
                    },
                  ],
                  fillColor: PDF_COLORS.panel,
                  margin: [16, 14, 16, 14],
                },
                {
                  stack: [
                    { text: "KLIENT", style: "heroLabel" },
                    {
                      text: project.client?.name || "Bez klienta",
                      style: "heroValue",
                      margin: [0, 2, 0, 9],
                    },
                    ...(project.code
                      ? [
                          { text: "KÓD PROJEKTU", style: "heroLabel" },
                          { text: project.code, style: "heroValue", margin: [0, 2, 0, 0] },
                        ]
                      : []),
                  ],
                  fillColor: PDF_COLORS.brandSoft,
                  margin: [14, 14, 14, 14],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          margin: [0, 0, 0, 14],
        }
      );

      if (showSummary) {
        const pdfMetrics = [
          {
            label: "VYBRANÉ ÚLOHY",
            value: `${tasks.length}`,
            description: "Rozsah reportu",
          },
          {
            label: "ODPRACOVANÝ ČAS",
            value: formatHours(pdfTotalHours),
            description: `${pdfTotalEntryCount} záznamov`,
          },
          {
            label: "TYPY PRÁCE",
            value: `${timeEntryGroupsInPdf.length}`,
            description: "Podľa poznámky",
          },
        ];

        if (canIncludePricesInPdf) {
          pdfMetrics.push({
            label: "HODNOTA REPORTU",
            value: formatMoney(totalPrice),
            description: reportCurrency,
          });
        }

        pdfContent.push({
          table: {
            widths: pdfMetrics.map(() => "*"),
            body: [
              pdfMetrics.map((metric) => ({
                stack: [
                  {
                    canvas: [
                      {
                        type: "rect",
                        x: 0,
                        y: 0,
                        w: 18,
                        h: 2,
                        r: 1,
                        color: PDF_COLORS.brand,
                      },
                    ],
                    margin: [0, 0, 0, 7],
                  },
                  { text: metric.label, style: "metricLabel" },
                  { text: metric.value, style: "metricValue" },
                  { text: metric.description, style: "metricDescription" },
                ],
                fillColor: PDF_COLORS.white,
                margin: [11, 10, 11, 10],
              })),
            ],
          },
          layout: {
            hLineWidth: () => 0.6,
            vLineWidth: () => 0.6,
            hLineColor: () => PDF_COLORS.borderStrong,
            vLineColor: () => PDF_COLORS.borderStrong,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          margin: [0, 0, 0, 0],
        });

        if (donutSegments.length > 0) {
          const donutTotal = donutSegments.reduce((sum, segment) => sum + segment.value, 0);

          pdfContent.push(createPdfSectionHeader(donutTitle, donutMeta), {
            table: {
              widths: [178, "*"],
              body: [
                [
                  {
                    svg: createPdfDonutSvg(donutSegments, donutCenterValue, donutCenterLabel),
                    width: 152,
                    margin: [13, 8, 13, 8],
                    alignment: "center",
                  },
                  {
                    stack: [
                      { text: "ROZLOŽENIE", style: "legendEyebrow", margin: [0, 7, 0, 7] },
                      ...donutLegendSegments.map((segment) => ({
                        columns: [
                          {
                            canvas: [
                              {
                                type: "rect",
                                x: 0,
                                y: 2,
                                w: 7,
                                h: 7,
                                r: 2,
                                color: segment.color,
                              },
                            ],
                            width: 15,
                          },
                          { text: segment.label, style: "legendLabel", width: "*" },
                          {
                            text:
                              pdfTotalHours > 0
                                ? formatHours(segment.value)
                                : `${segment.value} (${Math.round((segment.value / donutTotal) * 100)} %)`,
                            style: "legendValue",
                            width: 74,
                            alignment: "right",
                          },
                        ],
                        margin: [0, 0, 0, 8],
                      })),
                    ],
                    fillColor: PDF_COLORS.panel,
                    margin: [14, 10, 14, 10],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.6,
              vLineWidth: () => 0.6,
              hLineColor: () => PDF_COLORS.borderStrong,
              vLineColor: () => PDF_COLORS.borderStrong,
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
            unbreakable: true,
          });
        }
      }

      if (showTasksTable && tasks.length > 0) {
        const taskHeader: PdfContent[] = [
          { text: "ÚLOHA", style: "tableHeader" },
          { text: "STATUS", style: "tableHeader" },
          { text: "HODINY", style: "tableHeader", alignment: "right" },
        ];
        const taskWidths: Array<string | number> = ["*", 92, 62];

        if (canIncludePricesInPdf) {
          taskHeader.push({ text: "HODNOTA", style: "tableHeader", alignment: "right" });
          taskWidths.push(72);
        }

        const taskRows = tasks.map((task) => {
          const hideHours = !!taskIdsHideHoursInPdf[task.id];
          const taskColor = resolveTaskColor(task) || PDF_COLORS.brand;
          const row: PdfContent[] = [
            {
              columns: [
                {
                  canvas: [
                    {
                      type: "rect",
                      x: 0,
                      y: 1,
                      w: 4,
                      h: 21,
                      r: 2,
                      color: taskColor,
                    },
                  ],
                  width: 13,
                },
                {
                  stack: [
                    { text: task.title, style: "tableCellStrong" },
                    {
                      text: task.estimated_hours
                        ? `Odhad ${formatHours(task.estimated_hours)}`
                        : "Bez časového odhadu",
                      style: "tableCellCaption",
                      margin: [0, 2, 0, 0],
                    },
                  ],
                  width: "*",
                },
              ],
            },
            {
              text: getTaskStatusLabel(task.status),
              style: "tableCellStatus",
              color: PDF_STATUS_COLORS[task.status] || PDF_COLORS.muted,
            },
            {
              text: hideHours ? "Skryté" : formatHours(task.actual_hours || 0),
              style: hideHours ? "tableCellMuted" : "tableCellStrong",
              alignment: "right",
            },
          ];

          if (canIncludePricesInPdf) {
            row.push({
              text: formatMoney(getTaskPrice(task)),
              style: "tableCellStrong",
              alignment: "right",
            });
          }

          return row;
        });

        pdfContent.push(createPdfSectionHeader("Úlohy a časy", `${tasks.length} úloh`), {
          table: {
            headerRows: 1,
            widths: taskWidths,
            body: [taskHeader, ...taskRows],
            dontBreakRows: true,
            keepWithHeaderRows: 1,
          },
          layout: createPdfTableLayout(),
        });
      }

      if (showTimeEntries && timeEntryGroupsInPdf.length > 0) {
        const activityRows = timeEntryGroupsInPdf.map((group) => [
          {
            columns: [
              {
                canvas: [
                  {
                    type: "ellipse",
                    x: 3,
                    y: 5,
                    r1: 3,
                    r2: 3,
                    color: PDF_COLORS.brand,
                  },
                ],
                width: 14,
              },
              { text: group.description, style: "tableCellStrong", width: "*" },
            ],
          },
          { text: group.taskTitles.join(", "), style: "tableCellMuted" },
          { text: `${group.entryCount}`, style: "tableCell", alignment: "right" },
          { text: formatHours(group.hours), style: "tableCellStrong", alignment: "right" },
        ]);

        pdfContent.push(
          createPdfSectionHeader(
            "Práca podľa poznámky",
            `${timeEntryGroupsInPdf.length} typov práce`
          ),
          {
            table: {
              headerRows: 1,
              widths: ["*", "*", 52, 62],
              body: [
                [
                  { text: "POZNÁMKA", style: "tableHeader" },
                  { text: "ÚLOHY", style: "tableHeader" },
                  { text: "ZÁZNAMY", style: "tableHeader", alignment: "right" },
                  { text: "HODINY", style: "tableHeader", alignment: "right" },
                ],
                ...activityRows,
              ],
              dontBreakRows: true,
              keepWithHeaderRows: 1,
            },
            layout: createPdfTableLayout(),
          }
        );
      }

      if (showTimeEntries && visibleTimeEntriesInPdf.some((item) => item.timeEntries.length > 0)) {
        pdfContent.push({
          ...createPdfSectionHeader("Detailné časové záznamy", `${pdfTotalEntryCount} záznamov`),
          pageBreak: "before",
          margin: [0, 0, 0, 8],
        });

        visibleTimeEntriesInPdf
          .filter(({ timeEntries: entries }) => entries.length > 0)
          .forEach(({ taskTitle, timeEntries: entries }) => {
            const detailHeader: PdfContent[] = [
              { text: "DÁTUM", style: "tableHeader" },
              { text: "POUŽÍVATEĽ", style: "tableHeader" },
              { text: "POZNÁMKA", style: "tableHeader" },
              { text: "HODINY", style: "tableHeader", alignment: "right" },
            ];
            const detailWidths: Array<string | number> = [62, 92, "*", 58];

            if (canIncludeHourlyRatesInPdf) {
              detailHeader.push({
                text: "SADZBA",
                style: "tableHeader",
                alignment: "right",
              });
              detailWidths.push(62);
            }

            if (canIncludePricesInPdf) {
              detailHeader.push({
                text: "SUMA",
                style: "tableHeader",
                alignment: "right",
              });
              detailWidths.push(66);
            }

            const detailRows = entries.map((entry) => {
              const userName = entry.user?.name || entry.user?.email || "Neznámy";
              const row: PdfContent[] = [
                { text: format(new Date(entry.date), "dd.MM.yyyy"), style: "tableCellMuted" },
                { text: userName, style: "tableCell" },
                { text: entry.description || "Bez poznámky", style: "tableCellMuted" },
                {
                  text: formatHours(entry.hours),
                  style: "tableCellStrong",
                  alignment: "right",
                },
              ];

              if (canIncludeHourlyRatesInPdf) {
                row.push({
                  text: formatMoney(entry.hourly_rate),
                  style: "tableCell",
                  alignment: "right",
                });
              }

              if (canIncludePricesInPdf) {
                row.push({
                  text: formatMoney(entry.amount),
                  style: "tableCellStrong",
                  alignment: "right",
                });
              }

              return row;
            });

            pdfContent.push({
              stack: [
                {
                  columns: [
                    { text: taskTitle, style: "taskTitle" },
                    {
                      text: formatHours(getTaskEntryHours(entries)),
                      style: "taskHours",
                      alignment: "right",
                    },
                  ],
                  margin: [0, 12, 0, 5],
                },
                {
                  table: {
                    headerRows: 1,
                    widths: detailWidths,
                    body: [detailHeader, ...detailRows],
                    dontBreakRows: true,
                    keepWithHeaderRows: 1,
                  },
                  layout: createPdfTableLayout(),
                },
              ],
              unbreakable: entries.length <= 8,
            });
          });
      }

      const docDefinition = {
        pageSize: "A4",
        pageMargins: [32, 32, 32, 42],
        content: pdfContent,
        footer: (currentPage: number, pageCount: number) => ({
          columns: [
            {
              text: [
                { text: "LAYERS", bold: true, color: PDF_COLORS.brand },
                { text: `  /  ${project.name}`, color: PDF_COLORS.subtle },
              ],
              color: PDF_COLORS.subtle,
              fontSize: 7,
              width: "*",
            },
            {
              text: `${currentPage} / ${pageCount}`,
              alignment: "right",
              color: PDF_COLORS.subtle,
              fontSize: 7,
              width: 44,
            },
          ],
          margin: [32, 12, 32, 0],
        }),
        styles: {
          eyebrow: {
            fontSize: 6.5,
            bold: true,
            color: PDF_COLORS.brand,
            characterSpacing: 0.9,
            margin: [0, 0, 0, 5],
          },
          reportTitle: {
            fontSize: 23,
            bold: true,
            color: PDF_COLORS.ink,
            lineHeight: 1.05,
          },
          reportMeta: {
            fontSize: 8,
            color: PDF_COLORS.muted,
          },
          heroLabel: {
            fontSize: 6,
            bold: true,
            color: PDF_COLORS.brand,
            characterSpacing: 0.65,
          },
          heroValue: {
            fontSize: 9,
            bold: true,
            color: PDF_COLORS.brandDark,
          },
          metricLabel: {
            fontSize: 6.5,
            bold: true,
            color: PDF_COLORS.inkSoft,
            characterSpacing: 0.5,
          },
          metricValue: {
            fontSize: 15,
            bold: true,
            color: PDF_COLORS.ink,
            margin: [0, 3, 0, 2],
          },
          metricDescription: {
            fontSize: 6.5,
            color: PDF_COLORS.subtle,
          },
          legendEyebrow: {
            fontSize: 6.5,
            bold: true,
            color: PDF_COLORS.brand,
            characterSpacing: 0.7,
          },
          legendLabel: {
            fontSize: 7.5,
            color: PDF_COLORS.inkSoft,
          },
          legendValue: {
            fontSize: 7.5,
            bold: true,
            color: PDF_COLORS.ink,
          },
          sectionTitle: {
            fontSize: 11.5,
            bold: true,
            color: PDF_COLORS.ink,
          },
          sectionMeta: {
            fontSize: 7.5,
            color: PDF_COLORS.muted,
            margin: [0, 2, 0, 0],
          },
          tableHeader: {
            fontSize: 6.5,
            bold: true,
            color: PDF_COLORS.brandDark,
            characterSpacing: 0.45,
          },
          tableCell: {
            fontSize: 7.5,
            color: PDF_COLORS.ink,
          },
          tableCellStrong: {
            fontSize: 7.5,
            bold: true,
            color: PDF_COLORS.ink,
          },
          tableCellMuted: {
            fontSize: 7.5,
            color: PDF_COLORS.muted,
          },
          tableCellStatus: {
            fontSize: 7.5,
            bold: true,
          },
          tableCellCaption: {
            fontSize: 6.5,
            color: PDF_COLORS.subtle,
          },
          taskTitle: {
            fontSize: 8.5,
            bold: true,
            color: PDF_COLORS.ink,
          },
          taskHours: {
            fontSize: 8,
            bold: true,
            color: PDF_COLORS.brand,
          },
        },
        defaultStyle: {
          font: "Roboto",
          fontSize: 8,
          color: PDF_COLORS.ink,
        },
      };

      pdfMake.createPdf(docDefinition).download(filename);
      toast({ title: "PDF je pripravené", description: "Report bol úspešne vygenerovaný." });
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

  return (
    <div className="page-shell animate-in-up">
      <PageHeader
        eyebrow={`Projektový report • ${format(generatedAt, "d. MMMM yyyy", { locale: sk })}`}
        icon={BarChart3}
        title={project.name}
        description="Súhrn odpracovaného času, úloh, odhadov a rozloženia práce."
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            {project.code && (
              <Badge variant="outline" className="font-mono text-[10px] font-medium">
                {project.code}
              </Badge>
            )}
            {project.client?.name && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                {project.client.name}
              </Badge>
            )}
          </div>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
              Späť
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isGeneratingPDF ? "Generujem PDF..." : "Stiahnuť PDF"}
            </Button>
          </>
        }
      />

      {canViewPrices && (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
              <ReceiptText aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Ceny v PDF</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Zobraziť alebo skryť hodnoty, sumy a hodinové sadzby vo výslednom exporte.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="include-prices-in-pdf"
              checked={includePricesInPdf}
              onCheckedChange={setIncludePricesInPdf}
              aria-label="Zobraziť ceny a sadzby v PDF"
            />
            <Label
              htmlFor="include-prices-in-pdf"
              className="cursor-pointer text-xs font-medium text-muted-foreground"
            >
              {includePricesInPdf ? "Zobrazené" : "Skryté"}
            </Label>
          </div>
        </section>
      )}

      {showSummary && (
        <>
          <MetricStrip items={metricItems} />
          <ProjectReportAnalytics tasks={tasks} timeEntries={timeEntries} />
        </>
      )}

      {showTasksTable && tasks.length > 0 && (
        <section className="surface-panel overflow-hidden">
          <ReportPanelHeader
            icon={ListChecks}
            title="Úlohy v reporte"
            description="Status, odpracovaný čas a nastavenie viditeľnosti hodín v PDF."
            meta={
              <Badge variant="secondary" className="w-fit text-[10px] font-medium">
                {tasks.length} {tasks.length === 1 ? "úloha" : "úloh"}
              </Badge>
            }
          />
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="min-w-[240px]">Úloha</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead className="w-[110px] text-right">Hodiny</TableHead>
                {showPricesInReport && (
                  <TableHead className="w-[120px] text-right">Hodnota</TableHead>
                )}
                <TableHead className="w-[170px]">Hodiny v PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const hideHours = !!taskIdsHideHoursInPdf[task.id];
                const taskColor = resolveTaskColor(task);

                return (
                  <TableRow
                    key={task.id}
                    style={
                      taskColor
                        ? {
                            boxShadow: `inset 3px 0 0 ${taskColor}`,
                            backgroundImage: `linear-gradient(90deg, ${taskColorToRgba(
                              taskColor,
                              0.07
                            )} 0, transparent 180px)`,
                          }
                        : undefined
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        {taskColor && (
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/5"
                            style={{ backgroundColor: taskColor }}
                          />
                        )}
                        <span>{task.title}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {task.estimated_hours
                          ? `Odhad ${formatHours(task.estimated_hours)}`
                          : "Bez časového odhadu"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TaskStatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatHours(task.actual_hours || 0)}
                    </TableCell>
                    {showPricesInReport && (
                      <TableCell className="text-right font-medium tabular-nums text-foreground">
                        {formatMoney(getTaskPrice(task))}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`hide-hours-${task.id}`}
                          checked={!hideHours}
                          onCheckedChange={(show) => handleToggleHideHoursInPdf(task.id, !show)}
                          aria-label={`Zobraziť hodiny úlohy „${task.title}“ v PDF`}
                        />
                        <Label
                          htmlFor={`hide-hours-${task.id}`}
                          className="cursor-pointer text-xs text-muted-foreground"
                        >
                          {hideHours ? "Skryté" : "Zobrazené"}
                        </Label>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}

      {showTimeEntries && timeEntryGroups.length > 0 && (
        <section className="surface-panel overflow-hidden">
          <ReportPanelHeader
            icon={Layers3}
            title="Práca podľa poznámky"
            description="Rovnaké poznámky sú zlúčené naprieč vybranými úlohami."
            meta={
              <Badge variant="secondary" className="w-fit text-[10px] font-medium">
                {timeEntryGroups.length} typov práce
              </Badge>
            }
          />
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="min-w-[220px]">Poznámka</TableHead>
                <TableHead className="min-w-[260px]">Úlohy</TableHead>
                <TableHead className="w-[100px] text-right">Záznamy</TableHead>
                <TableHead className="w-[110px] text-right">Hodiny</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntryGroups.map((group) => (
                <TableRow key={group.key}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                      <span className="font-medium text-foreground">{group.description}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {group.taskTitles.join(", ")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {group.entryCount}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {formatHours(group.hours)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {showTimeEntries && hasTimeEntries && (
        <section className="surface-panel overflow-hidden">
          <ReportPanelHeader
            icon={FileClock}
            title="Detailné časové záznamy"
            description="Jednotlivé zápisy rozdelené podľa úlohy a používateľa."
            meta={
              <Badge variant="secondary" className="w-fit text-[10px] font-medium">
                {totalEntryCount} záznamov
              </Badge>
            }
          />

          <div className="divide-y divide-border">
            {timeEntries
              .filter(({ timeEntries: entries }) => entries.length > 0)
              .map(({ taskId, taskTitle, timeEntries: entries }) => (
                <div key={taskId}>
                  <div className="flex items-center justify-between gap-4 bg-muted/15 px-4 py-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-semibold text-foreground">
                        {taskTitle}
                      </h3>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {entries.length} {entries.length === 1 ? "záznam" : "záznamov"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-brand">
                      {formatHours(getTaskEntryHours(entries))}
                    </span>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[120px]">Dátum</TableHead>
                        <TableHead className="min-w-[180px]">Používateľ</TableHead>
                        <TableHead className="min-w-[260px]">Poznámka</TableHead>
                        <TableHead className="w-[100px] text-right">Hodiny</TableHead>
                        {showHourlyRatesInReport && (
                          <TableHead className="w-[110px] text-right">Sadzba</TableHead>
                        )}
                        {showPricesInReport && (
                          <TableHead className="w-[110px] text-right">Suma</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => {
                        const userName = entry.user?.name || entry.user?.email || "Neznámy";

                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {format(new Date(entry.date), "dd.MM.yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-[10px] font-semibold text-muted-foreground">
                                  {getInitials(userName)}
                                </span>
                                <span className="truncate text-xs font-medium text-foreground">
                                  {userName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {entry.description || "Bez poznámky"}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold tabular-nums text-foreground">
                              {formatHours(entry.hours)}
                            </TableCell>
                            {showHourlyRatesInReport && (
                              <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                {formatMoney(entry.hourly_rate)}
                              </TableCell>
                            )}
                            {showPricesInReport && (
                              <TableCell className="text-right text-xs font-semibold tabular-nums text-foreground">
                                {formatMoney(entry.amount)}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
          </div>
        </section>
      )}

      <footer className="flex flex-col gap-1 border-t border-border pt-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Layers • Projektový report</span>
        <span>Vygenerované {format(generatedAt, "dd.MM.yyyy 'o' HH:mm")}</span>
      </footer>
    </div>
  );
}
