import { createClient } from "@/lib/supabase/server";

export interface ProjectFinance {
  // Basic info
  projectId: string;
  projectName: string;
  projectStatus: string;
  clientName: string;
  
  // Hours
  billableHours: number;
  totalHours: number;
  
  // Costs
  laborCost: number;        // Sum of time_entries.amount
  externalCost: number;     // Sum of cost_items.amount
  
  // Totals
  totalCost: number;        // laborCost + externalCost
  budgetAmount: number;
  
  // Profit/Loss
  profit: number;           // budgetAmount - totalCost
  profitPct: number;        // (profit / budgetAmount) × 100
  
  // Time series data for charts
  dailyData: DailyFinanceData[];
}

export interface DailyFinanceData {
  date: string;             // YYYY-MM-DD
  hours: number;
  laborCost: number;
  externalCost: number;
  totalRevenue: number;     // laborCost + externalCost
}

export const computeProjectFinance = async (
  projectId: string,
  taskId?: string
): Promise<ProjectFinance | null> => {
  const supabase = createClient();

  // 1. Get project details
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(`
      name, 
      client_id,
      clients!inner(name)
    `)
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    console.error("Failed to fetch project:", projectError);
    return null;
  }
  
  // Extract client name from nested object
  const clientData = project.clients as { name: string }[] | null;
  const clientName = clientData?.[0]?.name || "N/A";

  // 2. Get time entries
  let timeQuery = supabase
    .from("time_entries")
    .select("hours, amount, is_billable, date")
    .eq("project_id", projectId);
  
  if (taskId) {
    timeQuery = timeQuery.eq("task_id", taskId);
  }
  
  const { data: timeEntries, error: timeError } = await timeQuery;

  if (timeError) {
    console.error("Failed to fetch time entries:", timeError);
    return null;
  }

  // 3. Get cost items
  let costQuery = supabase
    .from("cost_items")
    .select("amount, is_billable, date")
    .eq("project_id", projectId);
  
  if (taskId) {
    costQuery = costQuery.eq("task_id", taskId);
  }
  
  const { data: costItems, error: costError } = await costQuery;

  if (costError) {
    console.error("Failed to fetch cost items:", costError);
    return null;
  }

  // 4. Calculate totals
  const billableHours = timeEntries
    ?.filter((te) => te.is_billable)
    .reduce((sum, te) => sum + (te.hours || 0), 0) || 0;

  const totalHours = timeEntries
    ?.reduce((sum, te) => sum + (te.hours || 0), 0) || 0;

  const laborCost = timeEntries
    ?.filter((te) => te.is_billable)
    .reduce((sum, te) => sum + (te.amount || 0), 0) || 0;

  const externalCost = costItems
    ?.filter((ci) => ci.is_billable)
    .reduce((sum, ci) => sum + (ci.amount || 0), 0) || 0;

  // 5. Get total budget from tasks
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("budget_amount")
    .eq("project_id", projectId);
  
  if (tasksError) {
    console.error("Failed to fetch tasks budget:", tasksError);
    return null;
  }
  
  const budgetAmount = tasks?.reduce((sum, task) => sum + (task.budget_amount || 0), 0) || 0;

  // 6. Calculate totals - labor + budget is revenue, external costs are losses
  const totalCost = externalCost; // Only external costs count as costs
  const totalRevenue = laborCost + budgetAmount; // Labor + budget is revenue/profit
  
  // 7. Calculate profit/loss
  const profit = totalRevenue - totalCost; // Revenue minus costs
  const profitPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // 8. Build daily data for charts
  const dailyMap = new Map<string, DailyFinanceData>();

  // Add time entries by date
  timeEntries?.forEach((te) => {
    if (!te.date) return;
    const existing = dailyMap.get(te.date) || {
      date: te.date,
      hours: 0,
      laborCost: 0,
      externalCost: 0,
      totalRevenue: 0,
    };
    
    existing.hours += te.hours || 0;
    if (te.is_billable) {
      existing.laborCost += te.amount || 0;
    }
    
    dailyMap.set(te.date, existing);
  });

  // Add cost items by date
  costItems?.forEach((ci) => {
    if (!ci.date) return;
    const existing = dailyMap.get(ci.date) || {
      date: ci.date,
      hours: 0,
      laborCost: 0,
      externalCost: 0,
      totalRevenue: 0,
    };
    
    if (ci.is_billable) {
      existing.externalCost += ci.amount || 0;
    }
    
    dailyMap.set(ci.date, existing);
  });

  // Calculate total revenue and sort by date
  const dailyData = Array.from(dailyMap.values())
    .map((day) => ({
      ...day,
      totalRevenue: day.laborCost + day.externalCost,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    projectId,
    projectName: project.name,
    projectStatus: "", // Removed status
    clientName,
    billableHours,
    totalHours,
    laborCost,
    externalCost,
    totalCost,
    budgetAmount,
    profit,
    profitPct,
    dailyData,
  };
};

