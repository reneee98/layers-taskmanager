import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validations/task";
import { validateSchema } from "@/lib/zod-helpers";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { logActivity, ActivityTypes, getUserDisplayName } from "@/lib/activity-logger";

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
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assigned_to");
    const parentTaskId = searchParams.get("parent_task_id");

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

    // Get the max order_index for this project within workspace
    const { data: maxOrderTask } = await supabase
      .from("tasks")
      .select("order_index")
      .eq("project_id", validation.data.project_id)
      .eq("workspace_id", workspaceId)
      .is("parent_task_id", validation.data.parent_task_id || null)
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

