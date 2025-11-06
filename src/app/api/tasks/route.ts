import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validations/task";
import { validateSchema } from "@/lib/zod-helpers";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { logActivity, ActivityTypes, getUserDisplayName } from "@/lib/activity-logger";
import { autoMoveOverdueTasksToToday } from "@/lib/task-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const supabase = createClient();
    
    // Get workspace owner ID pre filtrovanie assignees
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    
    const workspaceOwnerId = workspace?.owner_id;
    
    // Automatically move overdue tasks to today (non-blocking, don't fail request if this fails)
    autoMoveOverdueTasksToToday(supabase, workspaceId).catch(err => {
      console.error("Error in autoMoveOverdueTasksToToday:", err);
    });
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assigned_to");
    const parentTaskId = searchParams.get("parent_task_id");
    const noProject = searchParams.get("no_project") === "true"; // Get tasks without project

    let query = supabase
      .from("tasks")
      .select(`
        *,
        project:projects(id, name, code, hourly_rate_cents, budget_cents)
      `)
      .eq("workspace_id", workspaceId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    } else if (noProject) {
      query = query.is("project_id", null);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo);
    }

    if (parentTaskId) {
      query = query.eq("parent_task_id", parentTaskId);
    } else if (parentTaskId === null || searchParams.has("root_only")) {
      // Filter for root tasks only (no parent)
      query = query.is("parent_task_id", null);
    }

    const { data: tasks, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Fetch assignees and calculated price for each task
    const tasksWithAssignees = await Promise.all(
      (tasks || []).map(async (task) => {
        // Get assignees for this task
        const { data: assignees } = await supabase
          .from("task_assignees")
          .select("id, user_id, assigned_at, assigned_by")
          .eq("task_id", task.id)
          .eq("workspace_id", workspaceId);

        // Get user profiles for assignees - len pre členov workspace
        let assigneesWithUsers: any[] = [];
        if (assignees && assignees.length > 0) {
          const userIds = assignees.map(a => a.user_id);
          
          // Najprv skontrolujme, ktorí používatelia sú členmi workspace
          const { data: workspaceMembers } = await supabase
            .from("workspace_members")
            .select("user_id")
            .eq("workspace_id", workspaceId)
            .in("user_id", userIds);
          
          const memberUserIds = new Set(workspaceMembers?.map(m => m.user_id) || []);
          // Pripočítame aj owner workspace, ak je medzi assignees
          if (workspaceOwnerId) {
            memberUserIds.add(workspaceOwnerId);
          }
          
          // Filtruj assignees len na tých, ktorí sú členmi workspace
          const validAssignees = assignees.filter(a => memberUserIds.has(a.user_id));
          
          if (validAssignees.length > 0) {
            const validUserIds = validAssignees.map(a => a.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, display_name, email, role")
              .in("id", validUserIds);

            assigneesWithUsers = validAssignees.map(assignee => {
              const profile = profiles?.find(p => p.id === assignee.user_id);
              return {
                ...assignee,
                ...profile ? {
                  id: profile.id,
                  display_name: profile.display_name,
                  email: profile.email,
                  role: profile.role,
                } : {}
              };
            });
          }
        }

        // Calculate total price from time entries
        const { data: timeEntries } = await supabase
          .from("time_entries")
          .select("amount")
          .eq("task_id", task.id);

        const calculatedPrice = timeEntries?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;
        
        // Convert project rates from cents to euros
        const projectWithRates = task.project ? {
          ...task.project,
          hourly_rate: task.project.hourly_rate_cents ? task.project.hourly_rate_cents / 100 : null,
          fixed_fee: task.project.budget_cents ? task.project.budget_cents / 100 : null
        } : null;
        
        return {
          ...task,
          project: projectWithRates,
          assignees: assigneesWithUsers,
          calculated_price: calculatedPrice
        };
      })
    );

    return NextResponse.json({ success: true, data: tasksWithAssignees });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const body = await request.json();
    const validation = validateSchema(taskSchema, body);

    if (!validation.success) {
      return NextResponse.json(validation, { status: 400 });
    }

    const supabase = createClient();

    // Get current user for activity logging
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get project hourly rate if available
    let projectHourlyRateCents: number | null = null;
    if (validation.data.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("hourly_rate_cents")
        .eq("id", validation.data.project_id)
        .single();
      
      projectHourlyRateCents = project?.hourly_rate_cents || null;
    }

    // If budget_cents is set, automatically calculate estimated_hours = budget_cents / hourly_rate
    // Only if estimated_hours is not explicitly set (allows manual override)
    if (validation.data.budget_cents !== undefined && 
        validation.data.budget_cents !== null && 
        validation.data.budget_cents > 0 && 
        projectHourlyRateCents &&
        (validation.data.estimated_hours === undefined || validation.data.estimated_hours === null)) {
      // Calculate estimated_hours from budget
      const hourlyRate = projectHourlyRateCents / 100; // Convert cents to euros
      const budgetInEuros = validation.data.budget_cents / 100; // Convert cents to euros
      const calculatedHours = budgetInEuros / hourlyRate;
      validation.data.estimated_hours = Math.round(calculatedHours * 100) / 100; // Round to 2 decimal places
      console.log(`Auto-calculated estimated_hours from budget: ${validation.data.estimated_hours}h (budget: ${budgetInEuros}€, rate: ${hourlyRate}€/h)`);
    }

    // If estimated_hours is set and budget_cents is not explicitly provided, calculate budget automatically
    // Only if project_id is provided (tasks without project won't have hourly rate)
    if (validation.data.estimated_hours !== undefined && 
        validation.data.estimated_hours !== null && 
        validation.data.estimated_hours > 0 && 
        projectHourlyRateCents) {
      // Only calculate budget if budget_cents is not explicitly set in the request
      if (validation.data.budget_cents === undefined) {
        // Calculate budget: estimated_hours * hourly_rate (convert from cents to euros, then back to cents)
        const hourlyRate = projectHourlyRateCents / 100; // Convert cents to euros
        const budgetInEuros = validation.data.estimated_hours * hourlyRate;
        validation.data.budget_cents = Math.round(budgetInEuros * 100); // Convert back to cents
        console.log(`Auto-calculated budget from estimated_hours: ${budgetInEuros}€ (hours: ${validation.data.estimated_hours}h, rate: ${hourlyRate}€/h)`);
      }
    }

    // Get the max order_index for this project within workspace
    // If project_id is null, we need to handle it differently
    let maxOrderQuery = supabase
      .from("tasks")
      .select("order_index")
      .eq("workspace_id", workspaceId)
      .is("parent_task_id", validation.data.parent_task_id || null);
    
    if (validation.data.project_id) {
      maxOrderQuery = maxOrderQuery.eq("project_id", validation.data.project_id);
    } else {
      maxOrderQuery = maxOrderQuery.is("project_id", null);
    }
    
    const { data: maxOrderTask } = await maxOrderQuery
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    const nextOrderIndex = maxOrderTask ? (maxOrderTask.order_index || 0) + 1 : 0;

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        ...validation.data,
        workspace_id: workspaceId,
        order_index: validation.data.order_index ?? nextOrderIndex,
      })
      .select("*, project:projects(id, name, code)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Assignees are now set explicitly via the request body or after task creation
    // No automatic assignment of task creator

    // Log activity - task created
    const userDisplayName = await getUserDisplayName(user.id);
    await logActivity({
      workspaceId,
      userId: user.id,
      type: ActivityTypes.TASK_CREATED,
      action: `Vytvoril úlohu`,
      details: task.title,
      projectId: task.project_id,
      taskId: task.id,
      metadata: {
        status: task.status,
        priority: task.priority,
        estimated_hours: task.estimated_hours,
        due_date: task.due_date,
        assigned_to: task.assigned_to,
        user_display_name: userDisplayName
      }
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

