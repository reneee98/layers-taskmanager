"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatHours } from "@/lib/format";
import type { Project } from "@/types/database";

interface ProjectSummaryData {
  totalTasks: number;
  completedTasks: number;
  totalHours: number;
  totalBudget: number;
  totalCost: number;
  profit: number;
  profitPct: number;
}

interface ProjectSummaryProps {
  projectId: string;
}

export const ProjectSummary = ({ projectId }: ProjectSummaryProps) => {
  const [summary, setSummary] = useState<ProjectSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/summary`);
        const result = await response.json();

        if (result.success) {
          setSummary(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch project summary:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const completionRate = summary.totalTasks > 0 ? (summary.completedTasks / summary.totalTasks) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Úlohy */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Úlohy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.completedTasks}/{summary.totalTasks}
          </div>
          <p className="text-xs text-muted-foreground">
            {completionRate.toFixed(0)}% dokončené
          </p>
        </CardContent>
      </Card>

      {/* Hodiny */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Hodiny
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatHours(summary.totalHours)}
          </div>
          <p className="text-xs text-muted-foreground">
            Celkovo odpracované
          </p>
        </CardContent>
      </Card>

      {/* Rozpočet */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Rozpočet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalBudget)}
          </div>
          <p className="text-xs text-muted-foreground">
            Celkový rozpočet
          </p>
        </CardContent>
      </Card>

      {/* Zisk/Strata */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Zisk/Strata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              {formatCurrency(summary.profit)}
            </div>
            <Badge 
              variant={summary.profit >= 0 ? "default" : "destructive"}
              className="text-xs"
            >
              {summary.profitPct >= 0 ? "+" : ""}{summary.profitPct.toFixed(1)}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.profit >= 0 ? "Zisk" : "Strata"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
