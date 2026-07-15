"use client";

import { useState, useEffect } from "react";
import { usePermission } from "@/hooks/usePermissions";
import { Briefcase } from "lucide-react";
import { formatCurrency, formatHours } from "@/lib/format";
import { getMarginColor } from "@/lib/utils";
import type { ProjectFinance } from "@/server/finance/computeProjectFinance";
import type { TaskAssignee } from "@/types/database";
import { ExchangeRateNotice } from "@/components/currency/ExchangeRateNotice";
import { getEuroEquivalentLabel, normalizeCurrency } from "@/lib/currency";
import { useUsdExchangeRate } from "@/hooks/useUsdExchangeRate";

interface ProjectStatusCardProps {
  projectId: string;
  taskId?: string;
  assignees?: TaskAssignee[];
}

export function ProjectStatusCard({ projectId, taskId, assignees = [] }: ProjectStatusCardProps) {
  const [finance, setFinance] = useState<ProjectFinance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { hasPermission: canViewReports } = usePermission('financial', 'view_reports');
  const currency = normalizeCurrency(finance?.currency);
  const { rate } = useUsdExchangeRate(currency === "USD");
  const formatMoney = (value: number) => formatCurrency(value, currency);
  const euroEquivalent = (value: number) => getEuroEquivalentLabel(value, currency, rate?.usdPerEur);

  useEffect(() => {
    fetchFinanceData();
  }, [projectId, taskId]);

  // Listen for timer stopped and time entry added events to refresh data
  useEffect(() => {
    const handleRefresh = () => {
      // Small delay to ensure backend has processed the changes
      setTimeout(() => {
        fetchFinanceData();
      }, 600);
    };

    window.addEventListener('timerStopped', handleRefresh);
    window.addEventListener('timeEntryAdded', handleRefresh);

    return () => {
      window.removeEventListener('timerStopped', handleRefresh);
      window.removeEventListener('timeEntryAdded', handleRefresh);
    };
  }, [projectId, taskId]);

  const fetchFinanceData = async () => {
    // If taskId is provided, use task-specific finance endpoint
    if (taskId) {
      if (!taskId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/tasks/${taskId}/finance`);
        const result = await response.json();

        if (result.success && result.data) {
          setFinance(result.data);
        } else {
          setFinance(null);
        }
      } catch (error) {
        console.error("Failed to fetch task finance data:", error);
        setFinance(null);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Otherwise, use project finance endpoint
    if (!projectId || projectId === "unknown" || !projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/finance`);
      const result = await response.json();

      if (result.success && result.data) {
        setFinance(result.data);
      } else {
        setFinance(null);
      }
    } catch (error) {
      console.error("Failed to fetch project finance data:", error);
      setFinance(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Načítavam...</p>
      </div>
    );
  }

  if (!canViewReports || !finance) {
    return null;
  }

  // Calculate budget utilization from actual spent (labor + external costs)
  const budgetUsed = finance.totalCost || 0;
  const budgetTotal = finance.budgetAmount || 0;
  const budgetPercent = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;

  // Determine status (AT RISK if over 90% budget used)
  const isAtRisk = budgetPercent >= 90;

  // Profit is already calculated in computeTaskFinance/computeProjectFinance
  const profit = finance.profit || 0;
  const revenue = finance.revenue || 0;
  const margin = revenue > 0 ? ((profit / revenue) * 100) : 0;

  // Extra = amount billed over the fixed budget (T&M), consistent with TaskFinancePanel
  const extra = budgetTotal > 0 ? Math.max(0, budgetUsed - budgetTotal) : 0;

  // Get assignees from props
  const displayAssignees = assignees
    .slice(0, 3)
    .map((assignee: any) => ({
      id: assignee.user_id,
      name: assignee.user?.name || assignee.user?.display_name || assignee.user?.email || assignee.display_name || "",
    }));

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {currency === "USD" && (
        <div className="border-b border-border bg-muted/40 px-5 py-2">
          <ExchangeRateNotice currency={currency} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Status projektu</span>
        </div>
        {isAtRisk && (
          <span className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 dark:border-red-900/60 dark:bg-red-950/30">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive dark:text-red-400">
              At Risk
            </span>
          </span>
        )}
      </div>

      {/* Budget utilization */}
      <div className="space-y-2 px-5 py-4">
        <div className="flex items-end justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Čerpanie budgetu
          </span>
          <span className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-foreground">{formatMoney(budgetUsed)}</span>
            <span className="text-xs text-muted-foreground">/ {formatMoney(budgetTotal)}</span>
          </span>
        </div>
        {euroEquivalent(budgetTotal) && (
          <p className="text-xs text-muted-foreground">{euroEquivalent(budgetTotal)}</p>
        )}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              budgetPercent >= 90
                ? "bg-destructive"
                : budgetPercent >= 70
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 border-t border-border">
        <div className="space-y-1 border-b border-r border-border p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Zisk</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{formatMoney(profit)}</p>
        </div>
        <div className="space-y-1 border-b border-border p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Marža</p>
          <p className={`text-2xl font-bold tracking-tight ${getMarginColor(margin)}`}>
            {margin.toFixed(1)}%
          </p>
        </div>
        <div className="space-y-1 border-r border-border p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Čas</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {formatHours(finance.billableHours || 0)}
          </p>
        </div>
        <div className="space-y-1 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Extra
          </p>
          <p className="text-2xl font-bold tracking-tight text-brand">+{formatMoney(extra)}</p>
        </div>
      </div>

      {/* Team costs */}
      <div className="flex items-center justify-between border-t border-border bg-muted/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-foreground">Náklady tímu</span>
          {displayAssignees.length > 0 && (
            <div className="flex">
              {displayAssignees.map((assignee, idx) => (
                <div
                  key={assignee.id || idx}
                  title={assignee.name}
                  className="-mr-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted last:mr-0"
                >
                  <span className="text-[9px] font-semibold text-muted-foreground">
                    {getInitials(assignee.name)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs font-bold text-foreground">
          {formatMoney(finance.laborCost || 0)}
        </span>
      </div>
    </div>
  );
}
