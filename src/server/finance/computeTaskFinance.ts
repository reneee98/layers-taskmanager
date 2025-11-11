import { createClient } from "@/lib/supabase/server";
import { ProjectFinance, DailyFinanceData } from "./computeProjectFinance";

export const computeTaskFinance = async (
  taskId: string
): Promise<ProjectFinance | null> => {
  const supabase = createClient();

  // 1. Get task details
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      status,
      budget_cents,
      estimated_hours,
      hourly_rate_cents,
      workspace_id
    `)
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    console.error("Failed to fetch task:", taskError);
    return null;
  }

  // 2. Get time entries for this task
  const { data: timeEntries, error: timeEntriesError } = await supabase
    .from("time_entries")
    .select("hours, hourly_rate, amount, date, is_billable")
    .eq("task_id", taskId)
    .order("date", { ascending: true });

  if (timeEntriesError) {
    console.error("Failed to fetch time entries:", timeEntriesError);
    return null;
  }

  // 3. Calculate hours
  const billableTimeEntries = timeEntries?.filter(te => te.is_billable) || [];
  const billableHours = billableTimeEntries.reduce((sum, te) => sum + (te.hours || 0), 0);
  const totalHours = timeEntries?.reduce((sum, te) => sum + (te.hours || 0), 0) || 0;

  // 4. Calculate labor cost (sum of time_entries.amount)
  const laborCost = timeEntries?.reduce((sum, te) => sum + (te.amount || 0), 0) || 0;

  // 5. No external costs for tasks without projects (cost_items are project-level)
  const externalCost = 0;

  // 6. Calculate budget amount
  let budgetAmount = 0;
  if (task.budget_cents && task.budget_cents > 0) {
    budgetAmount = task.budget_cents / 100;
  } else if (timeEntries && timeEntries.length > 0) {
    // Calculate from time entries: sum(hours * hourly_rate)
    // Use task.hourly_rate_cents if available, otherwise use entry.hourly_rate
    const taskHourlyRate = task.hourly_rate_cents ? task.hourly_rate_cents / 100 : null;
    budgetAmount = timeEntries.reduce((sum, entry) => {
      const rate = taskHourlyRate || entry.hourly_rate || 0;
      return sum + ((entry.hours || 0) * rate);
    }, 0);
  }

  // 7. Calculate revenue (sum of time_entries.amount for billable entries)
  const revenue = billableTimeEntries.reduce((sum, te) => sum + (te.amount || 0), 0);

  // 8. Calculate totals
  const totalCost = externalCost; // Only external costs count as costs

  // 9. Calculate profit/loss
  const profit = revenue - totalCost;
  const profitPct = revenue > 0 ? (profit / revenue) * 100 : 0;

  // 10. Build daily data for charts
  const dailyDataMap = new Map<string, DailyFinanceData>();

  timeEntries?.forEach(entry => {
    if (!entry.date) return;
    
    const date = entry.date;
    if (!dailyDataMap.has(date)) {
      dailyDataMap.set(date, {
        date,
        hours: 0,
        laborCost: 0,
        externalCost: 0,
        totalRevenue: 0,
      });
    }

    const daily = dailyDataMap.get(date)!;
    daily.hours += entry.hours || 0;
    if (entry.is_billable) {
      daily.laborCost += entry.amount || 0;
      daily.totalRevenue += entry.amount || 0;
    }
  });

  const dailyData = Array.from(dailyDataMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    projectId: taskId,
    projectName: task.title,
    projectStatus: task.status,
    clientName: "Bez projektu",
    
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

