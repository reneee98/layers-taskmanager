"use client";

import { useState, useEffect } from "react";
import { usePermission } from "@/hooks/usePermissions";
import { Briefcase } from "lucide-react";
import { formatCurrency, formatHours } from "@/lib/format";
import type { ProjectFinance } from "@/server/finance/computeProjectFinance";
import type { TaskAssignee } from "@/types/database";

interface ProjectStatusCardProps {
  projectId: string;
  taskId?: string;
  assignees?: TaskAssignee[];
}

export function ProjectStatusCard({ projectId, taskId, assignees = [] }: ProjectStatusCardProps) {
  const [finance, setFinance] = useState<ProjectFinance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { hasPermission: canViewReports } = usePermission('financial', 'view_reports');

  useEffect(() => {
    fetchFinanceData();
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
      <div className="bg-white dark:bg-card border-[#e2e8f0] dark:border-border border-b border-l border-r border-t-4 rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-clip pb-px pt-1 px-px">
        <div className="p-5">
          <p className="text-muted-foreground text-sm">Načítavam...</p>
        </div>
      </div>
    );
  }

  if (!canViewReports || !finance) {
    return null;
  }

  // Calculate budget utilization
  // For tasks: use totalCost (laborCost + externalCost) which represents actual spent
  // For projects: use totalCost (laborCost + externalCost) which represents actual spent
  const budgetUsed = finance.totalCost || 0;
  const budgetTotal = finance.budgetAmount || 0;
  const budgetPercent = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;
  
  // Determine status (AT RISK if over 90% budget used)
  const isAtRisk = budgetPercent >= 90;
  
  // Calculate profit and margin
  // Profit is already calculated correctly in computeTaskFinance/computeProjectFinance
  const profit = finance.profit || 0;
  const margin = budgetTotal > 0 ? ((profit / budgetTotal) * 100) : 0;
  
  // Get assignees from props
  const displayAssignees = assignees
    .slice(0, 3)
    .map((assignee: any) => ({
      id: assignee.user_id,
      name: assignee.user?.name || assignee.user?.display_name || assignee.user?.email || assignee.display_name || "",
    }));

  return (
    <div className="bg-white dark:bg-card border-[#e2e8f0] dark:border-border border-b border-l border-r border-t-4 flex flex-col gap-6 items-start overflow-clip pb-px pt-1 px-px rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] w-full">
      {/* CardHeader */}
      <div className="border-b border-[#f1f5f9] dark:border-border h-[66px] w-full">
        <div className="flex items-center justify-between pb-px pt-0 px-5 h-full">
          {/* CardTitle */}
          <div className="h-5 relative w-[130px]">
            <Briefcase className="absolute left-0 top-[2px] h-4 w-4 text-[#0f172b] dark:text-foreground" />
            <span className="absolute font-bold leading-5 left-6 text-[#0f172b] dark:text-foreground text-sm top-[0.5px] tracking-[-0.1504px]">
              Status projektu
            </span>
          </div>
          {/* At Risk Badge */}
          {isAtRisk && (
            <div className="bg-[#fef2f2] dark:bg-red-900/20 border border-[#ffe2e2] dark:border-red-800 h-[21px] rounded-full w-[74px] relative">
              <div className="absolute bg-[#fb2c36] left-2 rounded-full size-[6px] top-[6.5px]" />
              <span className="absolute font-bold leading-[15px] left-5 text-[#e7000b] dark:text-red-400 text-[10px] top-[2.5px] tracking-[0.6172px] uppercase">
                At Risk
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CardContent */}
      <div className="w-full">
        <div className="flex flex-col items-start w-full">
          {/* Budget Utilization */}
          <div className="bg-white dark:bg-card flex flex-col gap-2 h-[82px] items-start pb-0 pt-5 px-5 w-full">
            <div className="flex h-5 items-end justify-between w-full">
              <div className="h-4 flex items-center">
                <span className="font-medium leading-4 text-[#62748e] dark:text-muted-foreground text-xs tracking-[0.3px] uppercase">
                  Čerpanie Budgetu
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold leading-5 text-[#0f172b] dark:text-foreground text-sm tracking-[-0.1504px]">
                  {formatCurrency(budgetUsed)}
                </span>
                <span className="font-normal leading-4 text-[#90a1b9] dark:text-muted-foreground text-xs">
                  / {formatCurrency(budgetTotal)}
                </span>
              </div>
            </div>
            <div className="bg-[#f1f5f9] dark:bg-muted flex flex-col h-[10px] items-start overflow-clip rounded-full w-full">
              <div 
                className={`h-[10px] rounded-full ${
                  budgetPercent >= 90 
                    ? "bg-[#ff8904]" 
                    : budgetPercent >= 70 
                    ? "bg-yellow-500" 
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="bg-[#f1f5f9] dark:bg-border h-px w-full" />

          {/* Zisk / Marža Row */}
          <div className="border-b border-[#f1f5f9] dark:border-border h-[96px] relative w-full">
            {/* Zisk */}
            <div className="absolute border-r border-[#f1f5f9] dark:border-border flex flex-col gap-2 h-[95px] items-start left-0 pl-5 pr-px py-5 top-0 w-1/2">
              <div className="h-[15px]">
                <span className="font-bold leading-[15px] text-[#90a1b9] dark:text-muted-foreground text-[10px] tracking-[0.6172px] uppercase">
                  Zisk
                </span>
              </div>
              <div className="flex-1">
                <span className="font-bold leading-8 text-[#0f172b] dark:text-foreground text-2xl tracking-[-0.5297px]">
                  {formatCurrency(profit)}
                </span>
              </div>
            </div>
            {/* Marža */}
            <div className="absolute flex flex-col gap-2 h-[95px] items-start left-1/2 pl-5 pr-0 py-5 top-0 w-1/2">
              <div className="h-[15px]">
                <span className="font-bold leading-[15px] text-[#90a1b9] dark:text-muted-foreground text-[10px] tracking-[0.6172px] uppercase">
                  Marža
                </span>
              </div>
              <div className="flex-1">
                <span className="font-bold leading-8 text-[#e17100] dark:text-orange-500 text-2xl tracking-[-0.5297px]">
                  {margin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Čas / Extra Row */}
          <div className="h-[91px] relative w-full">
            {/* Čas */}
            <div className="absolute border-r border-[#f1f5f9] dark:border-border flex flex-col gap-2 h-[91px] items-start left-0 pl-5 pr-px py-5 top-0 w-1/2">
              <div className="h-[15px]">
                <span className="font-bold leading-[15px] text-[#90a1b9] dark:text-muted-foreground text-[10px] tracking-[0.6172px] uppercase">
                  Čas
                </span>
              </div>
              <div className="flex-1">
                <span className="font-bold leading-7 text-[#0f172b] dark:text-foreground text-2xl tracking-[-0.4492px]">
                  {formatHours(finance.billableHours || 0)}
                </span>
              </div>
            </div>
            {/* Extra */}
            <div className="absolute flex flex-col gap-2 h-[91px] items-start left-1/2 pl-5 pr-0 py-5 top-0 w-1/2">
              <div className="h-[15px]">
                <span className="font-bold leading-[15px] text-[#90a1b9] dark:text-muted-foreground text-[10px] tracking-[0.6172px] uppercase">
                  Extra
                </span>
              </div>
              <div className="flex-1">
                <span className="font-bold leading-7 text-[#7f22fe] dark:text-purple-500 text-2xl tracking-[-0.4492px]">
                  {finance.externalCost > 0 ? `+${formatCurrency(finance.externalCost)}` : '+0€'}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="bg-[#f1f5f9] dark:bg-border h-px w-full" />

          {/* Team Costs */}
          <div className="bg-[rgba(248,250,252,0.3)] dark:bg-muted/30 flex flex-col gap-3 items-start p-5 w-full">
            <div className="flex h-4 items-center justify-between w-full">
              <div className="h-4">
                <span className="font-bold leading-4 text-[#314158] dark:text-foreground text-xs">
                  Náklady tímu
                </span>
              </div>
              <div className="h-4">
                <span className="font-bold leading-4 text-[#0f172b] dark:text-foreground text-xs">
                  {formatCurrency(finance.laborCost || 0)}
                </span>
              </div>
            </div>
            {/* Team Avatars */}
            {displayAssignees.length > 0 && (
              <div className="flex items-start pl-0 pr-[6px] py-0">
                {displayAssignees.map((assignee, idx) => (
                  <div
                    key={assignee.id || idx}
                    className="bg-[#f1f5f9] dark:bg-slate-700 border-2 border-solid border-white dark:border-slate-800 flex items-start mr-[-6px] overflow-clip p-[2px] rounded-full shadow-[0px_0px_0px_1px_#f1f5f9] dark:shadow-[0px_0px_0px_1px_#334155] shrink-0 size-[28px]"
                  >
                    <div className="bg-[#ececf0] dark:bg-slate-600 flex-1 h-6 min-h-px min-w-px rounded-full flex items-center justify-center">
                      <span className="font-normal leading-[14.286px] text-[#45556c] dark:text-slate-300 text-[10px] tracking-[0.1172px]">
                        {getInitials(assignee.name)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
