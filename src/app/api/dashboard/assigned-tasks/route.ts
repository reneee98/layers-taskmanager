import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { autoMoveOverdueTasksToToday } from "@/lib/task-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    const supabase = createClient();
    
    // Get workspace_id from request (query params, cookie, or user's default)
    const workspaceId = await getUserWorkspaceIdFromRequest(req);
    
    console.log(`DEBUG: Dashboard API - User ${user.email}, workspaceId: ${workspaceId}`);
    
    if (!workspaceId) {
      console.log(`DEBUG: Dashboard API - No workspace ID for user ${user.email}`);
      return NextResponse.json(
        { success: false, error: "Workspace ID je povinný" },
        { status: 400 }
      );
    }

    // Check if user has access to workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace nebol nájdený" },
        { status: 404 }
      );
    }
    
    // Check if user is owner or member
    const isOwner = workspace.owner_id === user.id;
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();
    
    if (!isOwner && !member) {
      return NextResponse.json(
        { success: false, error: "Nemáte prístup k tomuto workspace" },
        { status: 403 }
      );
    }

    // Uložíme workspace owner ID pre použitie neskôr
    const workspaceOwnerId = workspace.owner_id;

    // Automatically move overdue tasks to today (non-blocking, don't fail request if this fails)
    autoMoveOverdueTasksToToday(supabase, workspaceId).catch(err => {
      console.error("Error in autoMoveOverdueTasksToToday:", err);
    });
    
    // Získaj query parametre
    const { searchParams } = new URL(req.url);
    const showUnassigned = searchParams.get('show_unassigned') === 'true';
    const showAll = searchParams.get('show_all') === 'true';
    
    let tasks;
    let tasksError;
    
    if (showUnassigned) {
      // Zobraziť len nepriradené tasky (bez assigneeov)
      console.log(`DEBUG: Showing unassigned tasks in workspace ${workspaceId}`);
      
      // Najprv nájdeme všetky tasky s assignees
      const { data: tasksWithAssignees } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("workspace_id", workspaceId);
      
      const taskIdsWithAssignees = tasksWithAssignees?.map(ta => ta.task_id) || [];
      
      // Potom načítame všetky aktívne tasky a odfiltrujeme tie, ktoré majú assignees
      const { data: allTasks, error: allTasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          estimated_hours,
          actual_hours,
          start_date,
          end_date,
          due_date,
          created_at,
          updated_at,
          project_id,
          assignee_id,
          assigned_to,
          budget_cents,
          workspace_id,
          project:projects!inner(
            id,
            name,
            code,
            workspace_id,
            client:clients(name)
          )
        `)
        .eq("workspace_id", workspaceId)
        .neq("status", "done")
        .neq("status", "cancelled");
      
      // Filtrujeme nepriradené tasky (tie, ktoré NIE sú v taskIdsWithAssignees)
      tasks = allTasks?.filter(task => !taskIdsWithAssignees.includes(task.id)) || [];
      tasksError = allTasksError;
    } else if (showAll) {
      // Zobraziť všetky aktívne tasky v workspace (vrátane úloh bez assignees)
      console.log(`DEBUG: Showing all active tasks in workspace ${workspaceId}`);
      
      // Načítame všetky aktívne tasky v workspace
      const { data: allTasks, error: allTasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          estimated_hours,
          actual_hours,
          start_date,
          end_date,
          due_date,
          created_at,
          updated_at,
          project_id,
          assignee_id,
          assigned_to,
          budget_cents,
          workspace_id,
          project:projects!inner(
            id,
            name,
            code,
            workspace_id,
            client:clients(name)
          )
        `)
        .eq("workspace_id", workspaceId)
        .neq("status", "done")
        .neq("status", "cancelled");
      
      tasks = allTasks;
      tasksError = allTasksError;
    } else {
      // Zobraziť len tasky priradené aktuálnemu používateľovi
      const { data: taskAssignees, error: assigneesError } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId);

      if (assigneesError) {
        console.error("Error fetching task assignees:", assigneesError);
        return NextResponse.json(
          { success: false, error: assigneesError.message },
          { status: 500 }
        );
      }

      if (!taskAssignees || taskAssignees.length === 0) {
        console.log(`DEBUG: No tasks assigned to user ${user.id} in workspace ${workspaceId}`);
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      const taskIds = taskAssignees.map(ta => ta.task_id);
      console.log(`DEBUG: Found ${taskIds.length} tasks assigned to user ${user.id}:`, taskIds);

      // Načítaj úlohy s projektmi - len tie, kde je používateľ skutočne assignee
      const { data: userTasks, error: userTasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          estimated_hours,
          actual_hours,
          start_date,
          end_date,
          due_date,
          created_at,
          updated_at,
          project_id,
          assignee_id,
          assigned_to,
          budget_cents,
          workspace_id,
          project:projects!inner(
            id,
            name,
            code,
            workspace_id,
            client:clients(name)
          )
        `)
        .in("id", taskIds)
        .eq("workspace_id", workspaceId);
      
      tasks = userTasks;
      tasksError = userTasksError;
    }
    

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      return NextResponse.json(
        { success: false, error: tasksError.message },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      console.log(`DEBUG: No tasks found ${showAll ? 'in workspace' : 'for user'}`);
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    console.log(`DEBUG: Found ${tasks.length} tasks ${showAll ? 'in workspace' : 'for user ' + user.id}`);

    // Načítaj assignee-ov pre každú úlohu
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
                user: profile ? {
                  id: profile.id,
                  email: profile.email,
                  name: profile.display_name, // Map display_name to name
                  avatar_url: null,
                  role: profile.role,
                  is_active: true,
                  created_at: "",
                  updated_at: ""
                } : null
              };
            });
          }
        }

        return {
          ...task,
          assignees: assigneesWithUsers
        };
      })
    );

    // Transform data and calculate time until deadline
    const now = new Date();
    const transformedTasks = tasksWithAssignees
      .map((task) => {
        let daysUntilDeadline = null;
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          const diffTime = dueDate.getTime() - now.getTime();
          daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          ...task,
          days_until_deadline: daysUntilDeadline,
        };
      })
      .filter((task) => task.status !== 'done' && task.status !== 'invoiced') // Exclude done and invoiced tasks
      .sort((a, b) => {
        // Sort by deadline urgency (nulls last)
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

    return NextResponse.json({
      success: true,
      data: transformedTasks,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: "Neznáma chyba" },
      { status: 500 }
    );
  }
}
