import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const supabase = createClient();
    
    // SECURITY: Check if user is owner of the workspace
    // Only workspace owners can access invoices
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner (either workspace owner or has owner role)
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    const isOwner = workspace.owner_id === user.id || member?.role === 'owner';

    if (!isOwner) {
      console.log(`SECURITY: User ${user?.email} is not owner of workspace ${workspaceId}, blocking access to invoices`);
      return NextResponse.json({ success: false, error: "Access denied - only workspace owners can view invoices" }, { status: 403 });
    }

    // Get all projects first (filtered by workspace)
    const { data: allProjects, error: projectsError } = await supabase
      .from("projects")
      .select(`
        *,
        client:clients(*)
      `)
      .eq("workspace_id", workspaceId);

    if (projectsError) {
      return NextResponse.json(
        { success: false, error: projectsError.message },
        { status: 500 }
      );
    }

    // Get all tasks (not invoiced) to check project completion (filtered by workspace)
    const { data: allTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("status", "invoiced"); // All tasks except 'invoiced'

    if (tasksError) {
      return NextResponse.json(
        { success: false, error: tasksError.message },
        { status: 500 }
      );
    }

    // Group tasks by project
    const tasksByProject = (allTasks || []).reduce((acc: any, task: any) => {
      if (!acc[task.project_id]) {
        acc[task.project_id] = [];
      }
      acc[task.project_id].push(task);
      return acc;
    }, {});

    // Filter projects to only include those that have at least one done task
    const projectsWithDoneTasks = (allProjects || []).filter(project => {
      const projectTasks = tasksByProject[project.id] || [];
      if (projectTasks.length === 0) return false;
      
      // Check if project has at least one done task
      return projectTasks.some((task: any) => task.status === 'done');
    });

    // Get individual done tasks that don't belong to projects with done tasks
    const projectIdsWithDoneTasks = projectsWithDoneTasks.map(p => p.id);
    const individualDoneTasks = (allTasks || []).filter(task => 
      task.status === 'done' && !projectIdsWithDoneTasks.includes(task.project_id)
    );

    // Calculate totals for each project with done tasks
    const projectsWithTotals = await Promise.all(
      projectsWithDoneTasks.map(async (project) => {
        const allProjectTasks = tasksByProject[project.id] || [];
        const doneTasks = allProjectTasks.filter((task: any) => task.status === 'done');
        
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
        const fixedBudgetCost = doneTasks.reduce((sum: number, task: any) => sum + (task.budget_amount || 0), 0);
        
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
