"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Euro, 
  DollarSign,
  FileText,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatHours } from "@/lib/format";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ProjectFinance } from "@/server/finance/computeProjectFinance";

interface ProjectReportProps {
  projectId: string;
  taskId?: string;
}

export function ProjectReport({ projectId, taskId }: ProjectReportProps) {
  const [finance, setFinance] = useState<ProjectFinance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFinanceData();
  }, [projectId, taskId]);

  const fetchFinanceData = async () => {
    setIsLoading(true);
    try {
      const url = taskId 
        ? `/api/projects/${projectId}/finance?task_id=${taskId}`
        : `/api/projects/${projectId}/finance`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setFinance(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Načítavam report...</p>
      </div>
    );
  }

  if (!finance) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Žiadne dáta</p>
      </div>
    );
  }

  const getProfitColor = (pct: number) => {
    if (pct >= 20) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (pct >= 10) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    if (pct >= 0) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-red-500/10 text-red-500 border-red-500/20";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Hours Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Odpracované hodiny</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(finance.billableHours)}</div>
            <p className="text-xs text-muted-foreground">
              celkovo odpracovaných hodín
            </p>
          </CardContent>
        </Card>

        {/* Labor Cost Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pracovné náklady</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(finance.laborCost)}</div>
            <p className="text-xs text-muted-foreground">
              {formatHours(finance.billableHours)} @ priemer{" "}
              {finance.billableHours > 0
                ? formatCurrency(finance.laborCost / finance.billableHours)
                : formatCurrency(0)}
              /h
            </p>
          </CardContent>
        </Card>

        {/* External Costs Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Externé náklady</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(finance.externalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Softvér, licence, grafika, atď.
            </p>
          </CardContent>
        </Card>

        {/* Total Cost Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celkové náklady</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(finance.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Labor + External
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              = {formatCurrency(finance.laborCost)} + {formatCurrency(finance.externalCost)}
            </p>
          </CardContent>
        </Card>

        {/* Profit/Loss Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zisk / Strata</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{formatCurrency(finance.profit)}</div>
              <Badge className={getProfitColor(finance.profitPct)}>
                {finance.profitPct >= 0 ? "+" : ""}
                {finance.profitPct.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Rozpočet: {formatCurrency(finance.budgetAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hodiny podľa dňa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={finance.dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}.${date.getMonth() + 1}`;
                  }}
                />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value as string);
                    return date.toLocaleDateString("sk-SK");
                  }}
                  formatter={(value: number) => formatHours(value)}
                />
                <Bar dataKey="hours" fill="hsl(var(--primary))" name="Hodiny" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tržby podľa dňa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={finance.dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}.${date.getMonth() + 1}`;
                  }}
                />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value as string);
                    return date.toLocaleDateString("sk-SK");
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="laborCost" 
                  stroke="hsl(var(--primary))" 
                  name="Práca"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="externalCost" 
                  stroke="hsl(var(--destructive))" 
                  name="Externé"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalRevenue" 
                  stroke="hsl(var(--accent-foreground))" 
                  name="Celkom"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

