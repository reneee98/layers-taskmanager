"use client";

import { useId, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { sk } from "date-fns/locale";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChartNoAxesCombined,
  CircleGauge,
  Clock3,
  ListChecks,
  PieChart as PieChartIcon,
  Sparkles,
  Target,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatHours } from "@/lib/format";
import { groupReportTimeEntriesByDescription } from "@/lib/report-time-entry-groups";
import { getTaskStatusLabel } from "@/lib/task-status";
import { TASK_COLOR_PALETTE, resolveTaskColor } from "@/lib/task-colors";
import { cn } from "@/lib/utils";
import type { TaskTimeEntriesForReport } from "@/lib/report-time-entry-groups";
import type { Task } from "@/types/database";

type TrendMode = "daily" | "cumulative";

interface ProjectReportAnalyticsProps {
  tasks: Task[];
  timeEntries: TaskTimeEntriesForReport[];
}

const STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  sent_to_client: "#8b5cf6",
  done: "#10b981",
  invoiced: "#14b8a6",
  cancelled: "#ef4444",
};

const shortenLabel = (value: string, maxLength = 22) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const getPercent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const AnalyticsPanelHeader = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    {action}
  </header>
);

const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
      <ChartNoAxesCombined aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
    </span>
    <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
  </div>
);

export const ProjectReportAnalytics = ({ tasks, timeEntries }: ProjectReportAnalyticsProps) => {
  const [trendMode, setTrendMode] = useState<TrendMode>("daily");
  const gradientId = useId().replace(/:/g, "");

  const analytics = useMemo(() => {
    const totalHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
    const estimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
    const completedTasks = tasks.filter(
      (task) => task.status === "done" || task.status === "invoiced"
    ).length;

    const entriesByTaskId = new Map(
      timeEntries.map((item) => [
        item.taskId,
        item.timeEntries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0),
      ])
    );

    const taskData = tasks
      .map((task) => ({
        id: task.id,
        name: shortenLabel(task.title),
        fullTitle: task.title,
        color: resolveTaskColor(task) || TASK_COLOR_PALETTE[0],
        actual: task.actual_hours || entriesByTaskId.get(task.id) || 0,
        estimated: task.estimated_hours || 0,
      }))
      .filter((task) => task.actual > 0 || task.estimated > 0)
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 8);

    const dailyMap = new Map<string, number>();
    timeEntries.forEach(({ timeEntries: entries }) => {
      entries.forEach((entry) => {
        const date = entry.date?.slice(0, 10);
        if (!date) return;
        dailyMap.set(date, (dailyMap.get(date) || 0) + (Number(entry.hours) || 0));
      });
    });

    let cumulativeHours = 0;
    const dailyData = Array.from(dailyMap.entries())
      .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
      .map(([date, hours]) => {
        cumulativeHours += hours;
        return {
          date,
          label: format(parseISO(date), "d. MMM", { locale: sk }),
          hours,
          cumulative: cumulativeHours,
        };
      });

    const statusData = Object.entries(
      tasks.reduce<Record<string, number>>((counts, task) => {
        counts[task.status] = (counts[task.status] || 0) + 1;
        return counts;
      }, {})
    )
      .map(([status, value]) => ({
        status,
        name: getTaskStatusLabel(status),
        value,
        color: STATUS_COLORS[status] || "#64748b",
      }))
      .sort((a, b) => b.value - a.value);

    const workGroups = groupReportTimeEntriesByDescription(timeEntries);
    const topWorkGroups = workGroups.slice(0, 5);
    const groupedHours = workGroups.reduce((sum, group) => sum + group.hours, 0);
    const topTask = taskData[0];
    const activeDays = dailyData.length;

    return {
      activeDays,
      averageHoursPerDay: activeDays > 0 ? cumulativeHours / activeDays : 0,
      completedTasks,
      completedPercent: getPercent(completedTasks, tasks.length),
      dailyData,
      estimatedHours,
      estimateUsagePercent: getPercent(totalHours, estimatedHours),
      groupedHours,
      statusData,
      taskData,
      topTask,
      topWorkGroups,
      totalHours,
    };
  }, [tasks, timeEntries]);

  const trendDataKey = trendMode === "daily" ? "hours" : "cumulative";
  const trendLabel = trendMode === "daily" ? "Hodiny za deň" : "Kumulatívne hodiny";
  const taskChartHeight = Math.max(250, analytics.taskData.length * 48);
  const estimateDelta = analytics.totalHours - analytics.estimatedHours;
  const hasEstimate = analytics.estimatedHours > 0;

  return (
    <section aria-labelledby="report-analytics-title" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
              Analytický prehľad
            </span>
          </div>
          <h2
            id="report-analytics-title"
            className="mt-1 text-lg font-semibold tracking-tight text-foreground"
          >
            Čo je na projekte dôležité
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rýchly pohľad na tempo, odhady a rozloženie odpracovaného času.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium"
        >
          <Activity aria-hidden="true" className="h-3 w-3 text-brand" />
          {analytics.activeDays} aktívnych dní
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface-panel relative overflow-hidden p-4">
          <div className="absolute inset-y-0 left-0 w-1 bg-brand" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4 pl-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Tempo práce
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {formatHours(analytics.averageHoursPerDay)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">priemerne za aktívny deň</p>
            </div>
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-brand" />
          </div>
        </div>

        <div className="surface-panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Dokončenie
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {analytics.completedPercent} %
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {analytics.completedTasks} z {tasks.length} úloh hotových
              </p>
            </div>
            <ListChecks aria-hidden="true" className="h-4 w-4 text-emerald-500" />
          </div>
        </div>

        <div className="surface-panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Odhad vs. skutočnosť
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {hasEstimate ? `${analytics.estimateUsagePercent} %` : "Bez odhadu"}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  hasEstimate && estimateDelta > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              >
                {hasEstimate
                  ? estimateDelta > 0
                    ? `${formatHours(estimateDelta)} nad odhadom`
                    : `${formatHours(Math.abs(estimateDelta))} zostáva`
                  : "Úlohy nemajú časový odhad"}
              </p>
            </div>
            <Target aria-hidden="true" className="h-4 w-4 text-amber-500" />
          </div>
          {hasEstimate && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className={cn(
                  "h-full rounded-full",
                  analytics.estimateUsagePercent > 100 ? "bg-amber-500" : "bg-brand"
                )}
                style={{ width: `${Math.min(analytics.estimateUsagePercent, 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="surface-panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Najväčšia úloha
              </p>
              <p
                className="mt-2 truncate text-sm font-semibold text-foreground"
                title={analytics.topTask?.fullTitle}
              >
                {analytics.topTask?.fullTitle || "Bez dát"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {analytics.topTask
                  ? `${formatHours(analytics.topTask.actual)} • ${getPercent(analytics.topTask.actual, analytics.totalHours)} % času`
                  : "Zatiaľ bez zapísaného času"}
              </p>
            </div>
            <Clock3 aria-hidden="true" className="h-4 w-4 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="surface-panel overflow-hidden xl:col-span-2">
          <AnalyticsPanelHeader
            icon={Activity}
            title="Vývoj odpracovaného času"
            description="Aktivita podľa dní, podobne ako v súhrnných reportoch Toggl."
            action={
              <div
                className="flex w-fit rounded-lg border border-border bg-muted/30 p-0.5"
                role="group"
                aria-label="Režim grafu času"
              >
                {(["daily", "cumulative"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 rounded-md px-2.5 text-[11px]",
                      trendMode === mode &&
                        "bg-background text-foreground shadow-sm hover:bg-background"
                    )}
                    onClick={() => setTrendMode(mode)}
                    aria-pressed={trendMode === mode}
                  >
                    {mode === "daily" ? "Denne" : "Kumulatívne"}
                  </Button>
                ))}
              </div>
            }
          />
          {analytics.dailyData.length > 0 ? (
            <div className="h-[300px] px-2 pb-4 pt-6 sm:px-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.dailyData}
                  margin={{ top: 6, right: 10, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    minTickGap={24}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(value) => `${value} h`}
                  />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => {
                      const date = payload?.[0]?.payload?.date as string | undefined;
                      return date ? format(parseISO(date), "d. MMMM yyyy", { locale: sk }) : "";
                    }}
                    formatter={(value) => [formatHours(Number(value)), trendLabel]}
                  />
                  <Area
                    type="monotone"
                    dataKey={trendDataKey}
                    name={trendLabel}
                    stroke="hsl(var(--brand))"
                    fill={`url(#${gradientId})`}
                    strokeWidth={2.5}
                    activeDot={{
                      r: 4,
                      fill: "hsl(var(--brand))",
                      strokeWidth: 2,
                      stroke: "hsl(var(--background))",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="Po zapísaní času sa tu zobrazí vývoj práce podľa jednotlivých dní." />
          )}
        </div>

        <div className="surface-panel overflow-hidden">
          <AnalyticsPanelHeader
            icon={PieChartIcon}
            title="Stav úloh"
            description="Rozloženie vybraných úloh podľa statusu."
          />
          {analytics.statusData.length > 0 ? (
            <div className="grid gap-2 p-5 sm:grid-cols-[180px_1fr] xl:grid-cols-1">
              <div className="relative mx-auto h-[170px] w-full max-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={76}
                      paddingAngle={2}
                      stroke="transparent"
                    >
                      {analytics.statusData.map((item) => (
                        <Cell key={item.status} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [`${value} úloh`, "Počet"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold tracking-tight text-foreground">
                    {analytics.completedPercent}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">hotovo</span>
                </div>
              </div>
              <div className="space-y-2.5 self-center">
                {analytics.statusData.map((item) => (
                  <div key={item.status} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {item.name}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart message="V reporte nie sú vybrané žiadne úlohy." />
          )}
        </div>

        <div className="surface-panel overflow-hidden xl:col-span-2">
          <AnalyticsPanelHeader
            icon={BarChart3}
            title="Čas podľa úloh"
            description="Skutočne odpracované hodiny v porovnaní s odhadom."
            action={
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${TASK_COLOR_PALETTE[0]} 0 50%, ${TASK_COLOR_PALETTE[8]} 50%)`,
                    }}
                  />
                  Skutočnosť
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-muted-foreground/25" />
                  Odhad
                </span>
              </div>
            }
          />
          {analytics.taskData.length > 0 ? (
            <div className="px-2 py-5 sm:px-4" style={{ height: taskChartHeight + 40 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.taskData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  barGap={2}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(value) => `${value} h`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={118}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTitle || ""}
                    formatter={(value) => formatHours(Number(value))}
                  />
                  <Bar
                    name="Odhad"
                    dataKey="estimated"
                    fill="hsl(var(--muted-foreground) / 0.2)"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={9}
                  />
                  <Bar name="Skutočnosť" dataKey="actual" radius={[0, 4, 4, 0]} maxBarSize={9}>
                    {analytics.taskData.map((task) => (
                      <Cell key={task.id} fill={task.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="Po nastavení odhadov alebo zapísaní času sa tu zobrazí porovnanie úloh." />
          )}
        </div>

        <div className="surface-panel overflow-hidden">
          <AnalyticsPanelHeader
            icon={CircleGauge}
            title="Najčastejšia práca"
            description="Najväčšie skupiny podľa poznámok v časových záznamoch."
          />
          {analytics.topWorkGroups.length > 0 ? (
            <div className="space-y-4 p-5">
              {analytics.topWorkGroups.map((group, index) => {
                const percentage = getPercent(group.hours, analytics.groupedHours);
                return (
                  <div key={group.key}>
                    <div className="mb-1.5 flex items-center gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[9px] font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate text-xs font-medium text-foreground"
                        title={group.description}
                      >
                        {group.description}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {formatHours(group.hours)}
                      </span>
                    </div>
                    <div
                      className="ml-8 h-1.5 overflow-hidden rounded-full bg-muted"
                      aria-label={`${group.description}: ${percentage} % času`}
                    >
                      <div
                        className="h-full rounded-full bg-brand/80"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyChart message="Doplňte poznámky k časovým záznamom a report ukáže rozloženie práce." />
          )}
        </div>
      </div>
    </section>
  );
};
