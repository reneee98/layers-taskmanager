"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Wallet, Clock, Zap, TrendingUp, PieChart, Plus, Trash2, User, FileText, Briefcase } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import {
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ProjectFinance } from "@/server/finance/computeProjectFinance";
import { toast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermissions";

interface TaskFinancePanelProps {
  taskId: string;
}

interface TimeEntry {
  id: string;
  hours: number;
  amount: number;
  date: string;
  billing_type?: string;
  user?: {
    name: string;
    email: string;
  };
  hourly_rate?: number;
}

interface CostItem {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  date: string;
  category: string | null;
}

const COST_CATEGORIES = [
  "Software",
  "Hardware",
  "Licence",
  "Graphics",
  "Marketing",
  "Travel",
  "Other",
];

export function TaskFinancePanel({ taskId }: TaskFinancePanelProps) {
  const { hasPermission: canViewCosts } = usePermission('financial', 'view_costs');
  const { hasPermission: canCreateCosts } = usePermission('financial', 'create_costs');
  const { hasPermission: canDeleteCosts } = usePermission('financial', 'delete_costs');
  const [finance, setFinance] = useState<ProjectFinance | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [task, setTask] = useState<{
    sales_commission_enabled?: boolean;
    sales_commission_percent?: number | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [taskId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch finance data
      const financeResponse = await fetch(`/api/tasks/${taskId}/finance`);
      const financeResult = await financeResponse.json();
      if (financeResult.success) {
        setFinance(financeResult.data);
      }

      // Fetch time entries
      const timeResponse = await fetch(`/api/tasks/${taskId}/time`);
      const timeResult = await timeResponse.json();
      if (timeResult.success && timeResult.data) {
        setTimeEntries(timeResult.data);
      }

      // Fetch task data for commission settings
      const taskResponse = await fetch(`/api/tasks/${taskId}`);
      const taskResult = await taskResponse.json();
      if (taskResult.success && taskResult.data) {
        setTask({
          sales_commission_enabled: taskResult.data.sales_commission_enabled || false,
          sales_commission_percent: taskResult.data.sales_commission_percent || null,
        });
        
        // Fetch cost items if project_id exists
        if (taskResult.data.project_id) {
          const costResponse = await fetch(`/api/costs?project_id=${taskResult.data.project_id}&task_id=${taskId}`);
          const costResult = await costResponse.json();
          if (costResult.success) {
            setCostItems(costResult.data || []);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate metrics
  const fixedBudget = finance?.budgetAmount || 0;
  // Spent should be totalCost (laborCost + externalCost) which represents actual costs
  const spent = finance?.totalCost || 0;
  const remaining = Math.max(0, fixedBudget - spent);
  // Extra should be the amount from time entries with billing_type 'extra' or 'tm'
  // Or if totalCost exceeds budget, the difference is extra
  const extra = spent > fixedBudget ? (spent - fixedBudget) : 0;

  // Prepare chart data for budget consumption
  const budgetChartData = useMemo(() => {
    if (!finance?.dailyData || finance.dailyData.length === 0) {
      return [];
    }

    // Cumulative should include both laborCost and externalCost (totalCost)
    let cumulative = 0;
    return finance.dailyData.map((day, index) => {
      // Add both labor cost and external cost for that day
      const dayTotalCost = (day.laborCost || 0) + (day.externalCost || 0);
      cumulative += dayTotalCost;
      return {
        date: format(new Date(day.date), "d.M", { locale: sk }),
        fullDate: day.date,
        value: cumulative,
        budget: fixedBudget,
      };
    });
  }, [finance?.dailyData, fixedBudget]);

  // Prepare pie chart data for work distribution
  const workDistributionData = useMemo(() => {
    if (!finance) {
      return [];
    }

    // Use finance data for accurate calculations
    const laborCost = finance.laborCost || 0;
    const externalCost = finance.externalCost || 0;
    
    // Calculate labor within budget vs extra
    // Labor within budget is the minimum of laborCost and fixedBudget
    const laborBudget = Math.min(laborCost, fixedBudget);
    // Labor extra is the amount that exceeds the budget
    const laborExtra = Math.max(0, laborCost - fixedBudget);

    // Commission only if enabled in settings
    // Commission is calculated from total (budget + extra)
    const commissionEnabled = task?.sales_commission_enabled || false;
    const commissionPercent = task?.sales_commission_percent || 10;
    const totalForCommission = fixedBudget + extra; // Budget + Extra (T&M)
    const commission = commissionEnabled && totalForCommission > 0 
      ? totalForCommission * (commissionPercent / 100) 
      : 0;

    const items = [
      { name: "Labor (Budget)", value: laborBudget, color: "#3b82f6" },
      { name: "External", value: externalCost, color: "#f59e0b" },
      { name: "Labor (Extra)", value: laborExtra, color: "#8b5cf6" },
    ];
    
    // Only add commission if enabled
    if (commission > 0) {
      items.push({ name: "Provízia", value: commission, color: "#cbd5e1" });
    }

    return items.filter(item => item.value > 0);
  }, [finance, fixedBudget, task]);

  // Prepare transactions list
  const transactions = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'labor' | 'external' | 'commission' | 'extra';
      name: string;
      description: string | null;
      quantity: string;
      amount: number;
      date: string;
      user?: { name: string };
    }> = [];

    // Add labor entries
    timeEntries.forEach(entry => {
      if (entry.billing_type === 'extra' || entry.billing_type === 'tm') {
        items.push({
          id: entry.id,
          type: 'extra',
          name: entry.user?.name || 'Neznámy',
          description: 'Fakturované nad rámec budgetu',
          quantity: 'Time & Material',
          amount: entry.amount || 0,
          date: entry.date,
          user: entry.user,
        });
      } else {
        items.push({
          id: entry.id,
          type: 'labor',
          name: entry.user?.name || 'Neznámy',
          description: 'Interný náklad (Labor)',
          quantity: `${entry.hours || 0} h × ${formatCurrency(entry.hourly_rate || 0)}`,
          amount: entry.amount || 0,
          date: entry.date,
          user: entry.user,
        });
      }
    });

    // Add external costs
    costItems.forEach(cost => {
      items.push({
        id: cost.id,
        type: 'external',
        name: cost.name,
        description: cost.description || 'Externý náklad',
        quantity: 'Externý náklad',
        amount: cost.amount,
        date: cost.date,
      });
    });

    // Add commission only if enabled in settings
    // Commission is calculated from total (budget + extra)
    const commissionEnabled = task?.sales_commission_enabled || false;
    const commissionPercent = task?.sales_commission_percent || 10;
    const totalForCommission = fixedBudget + extra; // Budget + Extra (T&M)
    if (commissionEnabled && totalForCommission > 0) {
      items.push({
        id: 'commission',
        type: 'commission',
        name: 'Provízia (Sales)',
        description: 'Automatický výpočet',
        quantity: `${commissionPercent}% z ${formatCurrency(totalForCommission)} (${formatCurrency(fixedBudget)} + ${formatCurrency(extra)})`,
        amount: totalForCommission * (commissionPercent / 100),
        date: new Date().toISOString().split('T')[0],
      });
    }

    // Sort by date (newest first)
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [timeEntries, costItems, fixedBudget]);

  const totalCosts = transactions.reduce((sum, t) => sum + t.amount, 0);

  const handleSubmit = async () => {
    const amountValue = parseFloat(amount);
    if (!name || isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Chyba",
        description: "Vyplňte všetky povinné polia",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get projectId from task
      const taskResponse = await fetch(`/api/tasks/${taskId}`);
      const taskResult = await taskResponse.json();
      
      if (!taskResult.success || !taskResult.data?.project_id) {
        throw new Error("Nepodarilo sa nájsť projekt");
      }

      const payload = {
        project_id: taskResult.data.project_id,
        task_id: taskId,
        name,
        description: description || null,
        category,
        amount: amountValue,
        date,
        is_billable: true,
      };

      const response = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: `Náklad pridaný • ${formatCurrency(amountValue)}`,
        });
        setName("");
        setDescription("");
        setCategory("Other");
        setAmount("");
        setDate(new Date().toISOString().split("T")[0]);
        setIsDialogOpen(false);
        fetchData();
      } else {
        throw new Error(result.error || "Nepodarilo sa pridať náklad");
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa pridať náklad",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCost = async (id: string) => {
    if (!confirm("Naozaj chcete vymazať tento náklad?")) return;

    try {
      const response = await fetch(`/api/costs/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: "Úspech", description: "Náklad bol odstránený" });
        fetchData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa odstrániť náklad",
        variant: "destructive",
      });
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'labor':
        return <div className="bg-[#eff6ff] rounded-full size-8 flex items-center justify-center"><User className="h-4 w-4 text-blue-600" /></div>;
      case 'external':
        return <div className="bg-[#fffbeb] rounded-full size-8 flex items-center justify-center"><Briefcase className="h-4 w-4 text-amber-600" /></div>;
      case 'commission':
        return <div className="bg-[#f1f5f9] rounded-full size-8 flex items-center justify-center"><FileText className="h-4 w-4 text-slate-600" /></div>;
      case 'extra':
        return <div className="bg-[#ede9fe] rounded-full size-8 flex items-center justify-center"><Zap className="h-4 w-4 text-purple-600" /></div>;
      default:
        return <div className="bg-[#f1f5f9] rounded-full size-8 flex items-center justify-center"><FileText className="h-4 w-4" /></div>;
    }
  };

  const getTransactionRowClass = (type: string) => {
    if (type === 'extra') {
      return "bg-[rgba(245,243,255,0.5)] border-[#ede9fe]";
    }
    return "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!finance) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nepodarilo sa načítať finančné dáta</p>
        <p className="text-xs mt-2">Task ID: {taskId}</p>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#cbd5e1'];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Section - 4 Metric Cards */}
      <div className="flex gap-4 flex-wrap">
        {/* Fixný Budget */}
        <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] w-[155px] h-[100px]">
          <CardContent className="p-[21px] flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <p className="font-bold leading-[16.5px] text-[#90a1b9] dark:text-muted-foreground text-[11px] tracking-[0.6145px] uppercase">
                Fixný Budget
              </p>
              <Wallet className="h-4 w-4 text-[#90a1b9] dark:text-muted-foreground" />
            </div>
            <p className="font-bold leading-[32px] text-[#0f172b] dark:text-foreground text-[24px] tracking-[0.0703px]">
              {formatCurrency(fixedBudget)}
            </p>
          </CardContent>
        </Card>

        {/* Vyčerpané */}
        <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] w-[155px] h-[100px]">
          <CardContent className="p-[21px] flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <p className="font-bold leading-[16.5px] text-[#90a1b9] dark:text-muted-foreground text-[11px] tracking-[0.6145px] uppercase">
                Vyčerpané
              </p>
              <Wallet className="h-4 w-4 text-[#90a1b9] dark:text-muted-foreground" />
            </div>
            <p className="font-bold leading-[32px] text-[#0f172b] dark:text-foreground text-[24px] tracking-[0.0703px]">
              {formatCurrency(spent)}
            </p>
          </CardContent>
        </Card>

        {/* Zostáva */}
        <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] w-[155px] h-[100px]">
          <CardContent className="p-[21px] flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <p className="font-bold leading-[16.5px] text-[#90a1b9] dark:text-muted-foreground text-[11px] tracking-[0.6145px] uppercase">
                Zostáva
              </p>
              <Clock className="h-4 w-4 text-[#90a1b9] dark:text-muted-foreground" />
            </div>
            <p className="font-bold leading-[32px] text-[#096] dark:text-green-500 text-[24px] tracking-[0.0703px]">
              {formatCurrency(remaining)}
            </p>
          </CardContent>
        </Card>

        {/* Extra (T&M) */}
        <Card className="bg-[rgba(245,243,255,0.3)] dark:bg-purple-900/20 border border-[#ede9fe] dark:border-purple-800 rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] w-[157px] h-[100px]">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <p className="font-bold leading-[16.5px] text-[#7f22fe] dark:text-purple-400 text-[11px] tracking-[0.6145px] uppercase">
                Extra (T&M)
              </p>
              <Zap className="h-4 w-4 text-[#7f22fe] dark:text-purple-400" />
            </div>
            <p className="font-bold leading-[32px] text-[#7008e7] dark:text-purple-500 text-[24px] tracking-[0.0703px]">
              +{formatCurrency(extra)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section - Charts */}
      <div className="flex gap-6 flex-wrap">
        {/* Čerpanie Fixného Budgetu - Area Chart */}
        <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] flex-1 min-w-[453px] h-[373px]">
          <CardHeader className="border-b border-[#f8fafc] dark:border-border h-[67px] pb-0 pt-4 px-6">
            <CardTitle className="text-[14px] font-bold text-[#1d293d] dark:text-foreground tracking-[-0.1504px] flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Čerpanie Fixného Budgetu
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-8">
            {budgetChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={232}>
                <AreaChart data={budgetChartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8b5cf6" 
                    fillOpacity={1} 
                    fill="url(#colorValue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[232px] flex items-center justify-center text-muted-foreground text-sm">
                Žiadne dáta pre graf
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rozloženie Prác - Pie Chart */}
        <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] w-[215px] h-[373px]">
          <CardHeader className="border-b border-[#f8fafc] dark:border-border h-[67px] pb-0 pt-4 px-6">
            <CardTitle className="text-[14px] font-bold text-[#1d293d] dark:text-foreground tracking-[-0.1504px] flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Rozloženie Prác
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-8">
            {workDistributionData.length > 0 ? (
              <div className="flex flex-col items-center gap-6">
                <ResponsiveContainer width="100%" height={160}>
                  <RechartsPieChart>
                    <Pie
                      data={workDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {workDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 w-full">
                  {workDistributionData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="size-2 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[11px] font-medium text-[#45556c] dark:text-foreground">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[232px] flex items-center justify-center text-muted-foreground text-sm">
                Žiadne dáta pre graf
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Transactions Table */}
      <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <CardHeader className="border-b border-[#f1f5f9] dark:border-border h-[65px] pb-0 pt-0 px-6 flex items-center justify-between">
          <CardTitle className="text-[14px] font-bold text-[#1d293d] dark:text-foreground tracking-[-0.1504px]">
            Transakcie & Náklady
          </CardTitle>
          {canCreateCosts && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border h-[32px] px-3 rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-[#f8fafc] dark:hover:bg-muted">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="text-[12px] font-medium text-[#314158] dark:text-foreground">
                    Nový náklad
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Pridať náklad</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Názov *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="napr. Font Licencia"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Popis</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detailný popis..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategória</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COST_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Suma (€) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="250.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Dátum</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Zrušiť
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Pridať náklad
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* Table Header */}
            <div className="bg-[rgba(248,250,252,0.5)] dark:bg-muted/30 border-b border-[#f1f5f9] dark:border-border px-6 py-3 flex items-center justify-between">
              <div className="w-[214px]">
                <p className="text-[10px] font-bold text-[#90a1b9] dark:text-muted-foreground tracking-[0.6172px] uppercase">
                  Položka
                </p>
              </div>
              <div className="w-[214px] text-right">
                <p className="text-[10px] font-bold text-[#90a1b9] dark:text-muted-foreground tracking-[0.6172px] uppercase">
                  Množstvo / Sadzba
                </p>
              </div>
              <div className="w-[214px] text-right">
                <p className="text-[10px] font-bold text-[#90a1b9] dark:text-muted-foreground tracking-[0.6172px] uppercase">
                  Spolu
                </p>
              </div>
            </div>

            {/* Table Rows */}
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Žiadne transakcie
              </div>
            ) : (
              <>
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={`border-b border-[#f1f5f9] dark:border-border px-6 py-4 flex items-center justify-between ${getTransactionRowClass(transaction.type)}`}
                  >
                    <div className="w-[214px] flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="text-[14px] font-medium text-[#0f172b] dark:text-foreground tracking-[-0.1504px]">
                          {transaction.name}
                        </p>
                        <p className="text-[11px] text-[#90a1b9] dark:text-muted-foreground tracking-[0.0645px]">
                          {transaction.description}
                        </p>
                        {transaction.date && (
                          <p className="text-[11px] text-[#90a1b9] dark:text-muted-foreground tracking-[0.0645px] mt-0.5">
                            {format(new Date(transaction.date), "yyyy-MM-dd")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-[214px] text-right">
                      <p className="text-[12px] text-[#45556c] dark:text-foreground">
                        {transaction.quantity}
                      </p>
                    </div>
                    <div className="w-[214px] text-right flex items-center justify-end gap-2">
                      <p className={`text-[14px] font-bold tracking-[-0.1504px] ${
                        transaction.type === 'extra' 
                          ? 'text-[#7008e7] dark:text-purple-500' 
                          : 'text-[#0f172b] dark:text-foreground'
                      }`}>
                        {transaction.type === 'extra' ? '+' : ''}{formatCurrency(transaction.amount)}
                      </p>
                      {canDeleteCosts && transaction.type === 'external' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCost(transaction.id)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total Row */}
                <div className="bg-[rgba(248,250,252,0.3)] dark:bg-muted/30 border-t border-[#e2e8f0] dark:border-border px-6 py-4 flex items-center justify-between">
                  <div className="w-[214px]">
                    <p className="text-[14px] font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px]">
                      SPOLU NÁKLADY
                    </p>
                  </div>
                  <div className="w-[214px]" />
                  <div className="w-[214px] text-right">
                    <p className="text-[18px] font-bold text-[#0f172b] dark:text-foreground tracking-[-0.4395px]">
                      {formatCurrency(totalCosts)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
