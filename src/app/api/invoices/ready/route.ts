import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get all projects first
    const { data: allProjects, error: projectsError } = await supabase
      .from("projects")
      .select(`
        *,
        client:clients(*)
      `);

    if (projectsError) {
      return NextResponse.json(
        { success: false, error: projectsError.message },
        { status: 500 }
      );
    }

    // Get all done tasks
    const { data: allDoneTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "done");

    if (tasksError) {
      return NextResponse.json(
        { success: false, error: tasksError.message },
        { status: 500 }
      );
    }

    // Group done tasks by project
    const tasksByProject = (allDoneTasks || []).reduce((acc: any, task: any) => {
      if (!acc[task.project_id]) {
        acc[task.project_id] = [];
      }
      acc[task.project_id].push(task);
      return acc;
    }, {});

    // Filter projects to only include those with done tasks
    const projectsWithDoneTasks = (allProjects || []).filter(project => 
      tasksByProject[project.id] && tasksByProject[project.id].length > 0
    );

    // Get individual done tasks that don't belong to projects with done tasks
    const projectIdsWithDoneTasks = projectsWithDoneTasks.map(p => p.id);
    const individualDoneTasks = (allDoneTasks || []).filter(task => 
      !projectIdsWithDoneTasks.includes(task.project_id)
    );

    // Calculate totals for each project with done tasks
    const projectsWithTotals = await Promise.all(
      projectsWithDoneTasks.map(async (project) => {
        const doneTasks = tasksByProject[project.id] || [];
        
        // Get time entries for done tasks only
        const { data: timeEntries } = await supabase
          .from("time_entries")
          .select("amount")
          .in("task_id", doneTasks.map((t: any) => t.id));

        // Get cost items for done tasks only
        const { data: costItems } = await supabase
          .from("cost_items")
          .select("total")
          .in("task_id", doneTasks.map((t: any) => t.id));

        const laborCost = timeEntries?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;
        const externalCost = costItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
        
        // Add fixed budget amounts for done tasks
        const fixedBudgetCost = doneTasks.reduce((sum, task) => sum + (task.budget_amount || 0), 0);
        
        const totalCost = laborCost + externalCost + fixedBudgetCost;

        return {
          ...project,
          labor_cost: laborCost,
          external_cost: externalCost,
          fixed_budget_cost: fixedBudgetCost,
          total_cost: totalCost,
          task_count: doneTasks.length,
          done_tasks: doneTasks.map((task: any) => ({
            ...task,
            assignees: []
          }))
        };
      })
    );

    // Calculate totals for individual tasks
    const tasksWithTotals = await Promise.all(
      individualDoneTasks.map(async (task) => {
        // Get project info for this task
        const { data: project } = await supabase
          .from("projects")
          .select(`
            *,
            client:clients(*)
          `)
          .eq("id", task.project_id)
          .single();

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
        
        // Add fixed budget amount for this task
        const fixedBudgetCost = task.budget_amount || 0;
        
        const totalCost = laborCost + externalCost + fixedBudgetCost;

        return {
          ...task,
          project: project || null,
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
    console.error("Error fetching invoice data:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
