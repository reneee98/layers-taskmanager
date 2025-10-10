import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdOrThrow } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdOrThrow();
    
    const supabase = createClient();

    // Get all invoiced tasks (filtered by workspace)
    const { data: invoicedTasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        *,
        project:projects(*, client:clients(*))
      `)
      .eq("workspace_id", workspaceId)
      .eq("status", "invoiced");

    if (tasksError) {
      return NextResponse.json(
        { success: false, error: tasksError.message },
        { status: 500 }
      );
    }

    // Group tasks by project
    const tasksByProject = (invoicedTasks || []).reduce((acc: any, task: any) => {
      if (!acc[task.project_id]) {
        acc[task.project_id] = {
          project: task.project,
          tasks: []
        };
      }
      acc[task.project_id].tasks.push(task);
      return acc;
    }, {});

    // Calculate totals for each project
    const projectsWithTotals = await Promise.all(
      Object.values(tasksByProject).map(async (projectData: any) => {
        const project = projectData.project;
        const tasks = projectData.tasks;
        
        // Get time entries for all tasks in this project
        const { data: timeEntries } = await supabase
          .from("time_entries")
          .select("amount")
          .in("task_id", tasks.map((t: any) => t.id));

        // Get cost items for all tasks in this project
        const { data: costItems } = await supabase
          .from("cost_items")
          .select("total")
          .in("task_id", tasks.map((t: any) => t.id));

        const laborCost = timeEntries?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;
        const externalCost = costItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
        const fixedBudgetCost = tasks.reduce((sum: number, task: any) => sum + (task.budget_amount || 0), 0);
        const totalCost = laborCost + externalCost + fixedBudgetCost;

        return {
          ...project,
          labor_cost: laborCost,
          external_cost: externalCost,
          fixed_budget_cost: fixedBudgetCost,
          total_cost: totalCost,
          task_count: tasks.length,
          invoiced_at: tasks[0]?.invoiced_at, // Use first task's invoiced_at
          tasks: tasks.map((task: any) => ({
            ...task,
            assignees: []
          }))
        };
      })
    );

    // Calculate totals for individual tasks (not part of projects)
    const individualTasks = (invoicedTasks || []).filter(task => 
      !Object.keys(tasksByProject).includes(task.project_id)
    );

    const tasksWithTotals = await Promise.all(
      individualTasks.map(async (task) => {
        // Get time entries for this task
        const { data: timeEntries } = await supabase
          .from("time_entries")
          .select("amount")
          .eq("task_id", task.id);

        // Get cost items for this task
        const { data: costItems } = await supabase
          .from("cost_items")
          .select("total")
          .eq("task_id", task.id);

        const laborCost = timeEntries?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;
        const externalCost = costItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
        const fixedBudgetCost = task.budget_amount || 0;
        const totalCost = laborCost + externalCost + fixedBudgetCost;

        return {
          ...task,
          labor_cost: laborCost,
          external_cost: externalCost,
          fixed_budget_cost: fixedBudgetCost,
          total_cost: totalCost,
          assignees: []
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        projects: projectsWithTotals,
        tasks: tasksWithTotals,
      },
    });
  } catch (error) {
    console.error("Error fetching archived data:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
