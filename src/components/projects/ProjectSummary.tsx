"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatHours } from "@/lib/format";
import { usePermission } from "@/hooks/usePermissions";
import { ExchangeRateNotice } from "@/components/currency/ExchangeRateNotice";
import { getEuroEquivalentLabel, normalizeCurrency } from "@/lib/currency";
import { useUsdExchangeRate } from "@/hooks/useUsdExchangeRate";
import { CheckCircle2, Clock3, CircleDollarSign, ReceiptText } from "lucide-react";
import { MetricStrip, type MetricStripItem } from "@/components/layout/metric-strip";

interface ProjectSummaryData {
  totalTasks: number;
  completedTasks: number;
  totalHours: number;
  totalCost: number;
  totalBudget: number;
  profit: number;
  profitPct: number;
  currency: string;
}

interface ProjectSummaryProps {
  projectId: string;
  onUpdate?: (refreshFn: () => Promise<void>) => void;
}

export const ProjectSummary = ({ projectId, onUpdate }: ProjectSummaryProps) => {
  const [summary, setSummary] = useState<ProjectSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { hasPermission: canViewPrices } = usePermission('financial', 'view_prices');
  const { hasPermission: canViewCosts } = usePermission('financial', 'view_costs');
  const currency = normalizeCurrency(summary?.currency);
  const { rate } = useUsdExchangeRate(currency === "USD");
  const formatMoney = (value: number) => formatCurrency(value, currency);
  const euroEquivalent = (value: number) => getEuroEquivalentLabel(value, currency, rate?.usdPerEur);

  const fetchSummary = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      // Add timestamp to prevent caching and ensure fresh data
      const response = await fetch(`/api/projects/${projectId}/summary?t=${Date.now()}`);
      const result = await response.json();

      if (result.success) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch project summary:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSummary(true); // Show loading on initial fetch
  }, [fetchSummary]);

  // Listen for updates from parent component
  useEffect(() => {
    if (onUpdate) {
      // Register the refresh function with parent
      onUpdate(fetchSummary);
    }
  }, [onUpdate, fetchSummary]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-r border-border px-4 py-4 lg:border-b-0">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const completionRate = summary.totalTasks > 0 ? (summary.completedTasks / summary.totalTasks) * 100 : 0;
  const items: MetricStripItem[] = [
    {
      label: "Dokončené úlohy",
      value: `${summary.completedTasks}/${summary.totalTasks}`,
      description: `${completionRate.toFixed(0)} % projektu`,
      icon: CheckCircle2,
    },
    {
      label: "Odpracovaný čas",
      value: formatHours(summary.totalHours),
      description: "Celkovo na projekte",
      icon: Clock3,
    },
  ];

  if (canViewCosts) {
    items.push({
      label: "Náklady",
      value: formatMoney(summary.totalCost),
      description: euroEquivalent(summary.totalCost) || "Externé a interné náklady",
      icon: CircleDollarSign,
    });
  }

  if (canViewPrices) {
    items.push({
      label: "Na fakturáciu",
      value: formatMoney(summary.totalBudget || 0),
      description: euroEquivalent(summary.totalBudget || 0) || "Hodnota projektu",
      icon: ReceiptText,
      tone: "text-emerald-600 dark:text-emerald-400",
    });
  }

  return (
    <div className="space-y-3">
      <ExchangeRateNotice currency={currency} />
      <MetricStrip items={items} />
    </div>
  );
};
