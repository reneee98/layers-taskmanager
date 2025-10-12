import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

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

    
    // Použij task_assignees tabuľku na nájdenie priradených úloh v workspace
    const { data: tasks, error: tasksError } = await supabase
      .from("task_assignees")
      .select(`
        task:tasks!inner(
          id,
          title,
          description,
          status,
          priority,
          estimated_hours,
          actual_hours,
          due_date,
          created_at,
          updated_at,
          project_id,
          assignee_id,
          assigned_to,
          budget_amount,
          workspace_id,
          project:projects!inner(
            id,
            name,
            code,
            workspace_id,
            client:clients(name)
          )
        )
      `)
      .eq("user_id", user.id)
      .eq("task.workspace_id", workspaceId);
    

    if (tasksError) {
      return NextResponse.json(
        { success: false, error: tasksError.message },
        { status: 500 }
      );
    }

    // Transform data and calculate time until deadline
    const now = new Date();
    const transformedTasks = (tasks || [])
      .map(({ task }: any) => {
        if (!task) return null;
        
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
      .filter(Boolean)
      .filter((task): task is NonNullable<typeof task> => task !== null && task.status !== 'done' && task.status !== 'invoiced') // Exclude done and invoiced tasks
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
