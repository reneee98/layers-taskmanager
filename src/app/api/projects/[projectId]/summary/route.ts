import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const projectId = params.projectId;

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name, status")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project not found:", projectError);
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Get tasks count and completion
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, status, budget_cents")
      .eq("project_id", projectId);

    if (tasksError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch tasks" },
        { status: 500 }
      );
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === "done").length;
    // Convert budget_cents to euros for calculation
    const totalBudget = tasks.reduce((sum, task) => sum + ((task.budget_cents || 0) / 100), 0);

    // Get time entries (labor cost) - get task IDs first
    const taskIds = tasks.map(task => task.id);
    let laborCost = 0;
    
    if (taskIds.length > 0) {
      try {
        const { data: timeEntries, error: timeError } = await supabase
          .from("time_entries")
          .select("amount")
          .in("task_id", taskIds);

        if (!timeError && timeEntries) {
          laborCost = timeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
        }
      } catch (error) {
        // Table doesn't exist, use 0
        laborCost = 0;
      }
    }

    // Get cost items (external cost) - optional, table might not exist
    let externalCost = 0;
    try {
      const { data: costItems, error: costError } = await supabase
        .from("cost_items")
        .select("amount")
        .in("task_id", taskIds);

      if (!costError && costItems) {
        externalCost = costItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      }
    } catch (error) {
      // Table doesn't exist, use 0
      externalCost = 0;
    }

    // Get total hours - get task IDs first
    let totalHours = 0;
    
    if (taskIds.length > 0) {
      try {
        const { data: hoursData, error: hoursError } = await supabase
          .from("time_entries")
          .select("hours")
          .in("task_id", taskIds);

        if (!hoursError && hoursData) {
          totalHours = hoursData.reduce((sum, entry) => sum + (entry.hours || 0), 0);
        }
      } catch (error) {
        // Table doesn't exist, use 0
        totalHours = 0;
      }
    }

    // Calculate totals - labor + budget is profit, external costs are losses
    const totalCost = externalCost; // Only external costs count as costs
    const totalRevenue = laborCost + totalBudget; // Labor + budget is revenue/profit
    const profit = totalRevenue - totalCost; // Revenue minus costs
    const profitPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    const summary = {
      totalTasks,
      completedTasks,
      totalHours,
      totalBudget,
      totalCost,
      profit,
      profitPct,
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error in project summary API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
