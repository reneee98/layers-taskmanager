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

    // 2. Get tasks first to filter by status
    let tasksQuery = supabase
      .from("tasks")
      .select("id, budget_cents, status, estimated_hours")
      .eq("project_id", projectId);

    if (taskId) {
      tasksQuery = tasksQuery.eq("id", taskId);
    }

    const { data: allTasks, error: tasksError } = await tasksQuery;

    if (tasksError) {
      console.error("Failed to fetch tasks:", tasksError);
      return null;
    }

    console.log("All tasks fetched:", allTasks?.map(t => ({ id: t.id, status: t.status, budget_cents: t.budget_cents })));

    // Filter only done tasks for profit/loss calculation
    // BUT: if taskId is specified, use that task regardless of status (for task detail view)
    let doneTasks: typeof allTasks = [];
    if (taskId) {
      // For task detail view, use the specific task even if not done
      const specificTask = allTasks?.find(task => task.id === taskId);
      if (specificTask) {
        doneTasks = [specificTask];
        console.log("Using specific task for detail view:", { id: specificTask.id, status: specificTask.status, budget_cents: specificTask.budget_cents });
      }
    } else {
      // For project view, only use done tasks
      doneTasks = allTasks?.filter(task => task.status === "done") || [];
      console.log("Done tasks:", doneTasks?.map(t => ({ id: t.id, status: t.status, budget_cents: t.budget_cents })));
    }
    const doneTaskIds = doneTasks.map(task => task.id);

  // 3. Get time entries - all for hours display, but only done tasks for profit calculation
  let timeQuery = supabase
    .from("time_entries")
    .select("id, hours, amount, is_billable, date, task_id, hourly_rate, user_id")
    .eq("project_id", projectId);

  if (taskId) {
    timeQuery = timeQuery.eq("task_id", taskId);
  }

  const { data: allTimeEntries, error: timeError } = await timeQuery;

  if (timeError) {
    console.error("Failed to fetch time entries:", timeError);
    return null;
  }

  // Recalculate amounts for time entries if they might be incorrect
  // This ensures that existing entries are recalculated based on current budget/estimated_hours
  if (allTimeEntries && allTimeEntries.length > 0) {
    // Group entries by task_id
    const entriesByTask = new Map<string, typeof allTimeEntries>();
    allTimeEntries.forEach(entry => {
      if (entry.task_id) {
        if (!entriesByTask.has(entry.task_id)) {
          entriesByTask.set(entry.task_id, []);
        }
        entriesByTask.get(entry.task_id)!.push(entry);
      }
    });

    // Recalculate for each task
    const taskEntriesArray = Array.from(entriesByTask.entries());
    for (const [taskIdForRecalc, taskEntries] of taskEntriesArray) {
      const task = doneTasks.find(t => t.id === taskIdForRecalc) || allTasks?.find(t => t.id === taskIdForRecalc);
      if (!task) continue;

      // Get hourly rate from first entry or project
      let hourlyRate = 0;
      if (taskEntries[0]?.hourly_rate) {
        hourlyRate = taskEntries[0].hourly_rate;
      } else if (taskEntries[0]?.user_id) {
        const { resolveHourlyRate } = await import("@/server/rates/resolveHourlyRate");
        const resolved = await resolveHourlyRate(taskEntries[0].user_id, projectId);
        hourlyRate = resolved.hourlyRate;
      }

      // Determine budget hours limit
      let budgetHoursLimit = 0;
      if (task.budget_cents && task.budget_cents > 0 && hourlyRate > 0) {
        const budgetInEuros = task.budget_cents / 100;
        budgetHoursLimit = budgetInEuros / hourlyRate;
      } else if (task.estimated_hours && task.estimated_hours > 0) {
        budgetHoursLimit = task.estimated_hours;
      }

      // Sort entries by date
      const sortedEntries = [...taskEntries].sort((a, b) => 
        (a.date || "").localeCompare(b.date || "")
      );

      // Recalculate amounts in chronological order
      let cumulativeHours = 0;
      for (const entry of sortedEntries) {
        const entryRate = entry.hourly_rate || hourlyRate;
        
        // Calculate how many hours from this entry are within budget
        const hoursWithinBudget = Math.max(0, Math.min(cumulativeHours, budgetHoursLimit));
        const remainingBudgetHours = Math.max(0, budgetHoursLimit - hoursWithinBudget);
        const newHoursWithinBudget = Math.min(entry.hours, remainingBudgetHours);
        
        // Hours that exceed the budget limit
        const hoursOverBudget = Math.max(0, entry.hours - newHoursWithinBudget);
        
        // Calculate expected amount
        const expectedAmount = hoursOverBudget * entryRate;
        
        // Update if amount is incorrect (allow small rounding differences)
        if (Math.abs((entry.amount || 0) - expectedAmount) > 0.01) {
          console.log(`Recalculating time entry ${entry.id}: old=${entry.amount}€, new=${expectedAmount}€`);
          await supabase
            .from("time_entries")
            .update({ amount: expectedAmount })
            .eq("id", entry.id);
          
          // Update the entry in our array
          entry.amount = expectedAmount;
        }

        cumulativeHours += entry.hours;
      }
    }
  }

  // Filter time entries for done tasks only (for profit calculation)
  const doneTimeEntries = allTimeEntries?.filter(te =>
    te.task_id && doneTaskIds.includes(te.task_id)
  ) || [];

  // 4. Get cost items - all for display, but only done tasks for profit calculation
  let costQuery = supabase
    .from("cost_items")
    .select("amount, is_billable, date, task_id")
    .eq("project_id", projectId);
  
  if (taskId) {
    costQuery = costQuery.eq("task_id", taskId);
  }
  
  const { data: allCostItems, error: costError } = await costQuery;

  if (costError) {
    console.error("Failed to fetch cost items:", costError);
    return null;
  }

  // Filter cost items for done tasks only (for profit calculation)
  const doneCostItems = allCostItems?.filter(ci => 
    ci.task_id && doneTaskIds.includes(ci.task_id)
  ) || [];

  // 5. Calculate totals - use all entries for hours, but only done tasks for profit
  const billableHours = allTimeEntries
    ?.filter((te) => te.is_billable)
    .reduce((sum, te) => sum + (te.hours || 0), 0) || 0;

  const totalHours = allTimeEntries
    ?.reduce((sum, te) => sum + (te.hours || 0), 0) || 0;

  // Use only done tasks for profit calculation
  const laborCost = doneTimeEntries
    ?.filter((te) => te.is_billable)
    .reduce((sum, te) => sum + (te.amount || 0), 0) || 0;

  // Debug logging for labor cost calculation
  console.log("Labor cost calculation:", {
    doneTimeEntriesCount: doneTimeEntries?.length || 0,
    billableEntriesCount: doneTimeEntries?.filter((te) => te.is_billable).length || 0,
    laborCost,
    timeEntriesDetails: doneTimeEntries?.filter((te) => te.is_billable).map(te => ({
      id: te.id,
      hours: te.hours,
      amount: te.amount,
      date: te.date
    }))
  });

  const externalCost = doneCostItems
    ?.filter((ci) => ci.is_billable)
    .reduce((sum, ci) => sum + (ci.amount || 0), 0) || 0;

  // 6. Get total budget from done tasks only
  // If budget_cents is set, use it. Otherwise, calculate from time entries (hours * hourly_rate)
  const budgetAmount = await Promise.all(
    doneTasks.map(async (task) => {
      if (task.budget_cents && task.budget_cents > 0) {
        const taskBudget = task.budget_cents / 100;
        console.log(`Task ${task.id}: budget_cents=${task.budget_cents}, budget=${taskBudget}`);
        return taskBudget;
      } else {
        // Calculate from time entries: sum(hours * hourly_rate)
        const { data: timeEntries } = await supabase
          .from("time_entries")
          .select("hours, hourly_rate")
          .eq("task_id", task.id);
        
        const calculatedPrice = timeEntries?.reduce((sum, entry) => {
          const entryAmount = (entry.hours || 0) * (entry.hourly_rate || 0);
          return sum + entryAmount;
        }, 0) || 0;
        console.log(`Task ${task.id}: no budget_cents, calculated from time entries: ${calculatedPrice}€`);
        return calculatedPrice;
      }
    })
  ).then(results => results.reduce((sum, val) => sum + val, 0));

  // 7. Calculate totals - labor + budget is revenue, external costs are losses (only for done tasks)
  const totalCost = externalCost; // Only external costs count as costs
  const totalRevenue = laborCost + budgetAmount; // Labor + budget is revenue/profit
  
  // 8. Calculate profit/loss
  const profit = totalRevenue - totalCost; // Revenue minus costs
  const profitPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // Debug logging
  console.log("Finance calculation:", {
    doneTasksCount: doneTasks.length,
    doneTaskIds,
    laborCost,
    externalCost,
    budgetAmount,
    totalRevenue,
    totalCost,
    profit,
    profitPct
  });

  // 9. Build daily data for charts - use all entries for display
  const dailyMap = new Map<string, DailyFinanceData>();

  // Add time entries by date (all entries for chart display)
  allTimeEntries?.forEach((te) => {
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

  // Add cost items by date (all entries for chart display)
  allCostItems?.forEach((ci) => {
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
  // For daily data, totalRevenue should be laborCost (since budget is per task, not per day)
  const dailyData = Array.from(dailyMap.values())
    .map((day) => ({
      ...day,
      totalRevenue: day.laborCost, // Daily revenue is just labor cost
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

