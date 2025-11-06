import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  let taskId: string = 'unknown';
  try {
    taskId = (await params).taskId;
    
    const supabase = createClient();
    
    // Get user's workspace ID
    let workspaceId: string | null = null;
    try {
      workspaceId = await getUserWorkspaceIdFromRequest(request);
    } catch (workspaceError) {
      console.error(`[GET /api/tasks/${taskId}/assignees] Error getting workspace ID:`, workspaceError);
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    if (!workspaceId) {
      console.error(`[GET /api/tasks/${taskId}/assignees] Workspace not found`);
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Get workspace owner ID pre filtrovanie assignees
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();
    
    const workspaceOwnerId = workspace?.owner_id;

    // First verify the task belongs to the user's workspace
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Úloha nebola nájdená" },
        { status: 404 }
      );
    }

    const { data: assignees, error } = await supabase
      .from("task_assignees")
      .select("*")
      .eq("task_id", taskId)
      .eq("workspace_id", workspaceId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch task assignees:", error);
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa načítať priradených používateľov" },
        { status: 500 }
      );
    }

    // Fetch users separately from profiles table - len pre členov workspace
    const userIds = assignees?.map(a => a.user_id) || [];
    let users: any[] = [];
    
    if (userIds.length > 0) {
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
      
      // Filtruj userIds len na tých, ktorí sú členmi workspace
      const validUserIds = Array.from(memberUserIds).filter(id => userIds.includes(id));
      
      if (validUserIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", validUserIds);
        
        if (usersError) {
          console.error("Failed to fetch users:", usersError);
          return NextResponse.json(
            { success: false, error: "Nepodarilo sa načítať používateľov" },
            { status: 500 }
          );
        }
        
        // Map display_name to name for frontend compatibility
        users = (usersData || []).map(user => ({
          ...user,
          name: user.display_name || user.email?.split('@')[0] || 'Neznámy'
        }));
      }
    }

    // Combine assignees with user data - len pre validné assignees (členov workspace)
    const assigneesWithUsers = assignees?.filter(assignee => {
      // Zobraz len assignees, ktorí sú členmi workspace
      const hasUser = users.find(u => u.id === assignee.user_id);
      return hasUser !== undefined;
    }).map(assignee => {
      const user = users.find(u => u.id === assignee.user_id);
      return {
        ...assignee,
        user: user
      };
    }) || [];

    return NextResponse.json({ success: true, data: assigneesWithUsers }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[GET /api/tasks/${taskId}/assignees] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Vnútorná chyba servera";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Dynamic import to avoid loading validation schema in GET handler
    const { z } = await import("zod");
    const assigneesSchema = z.object({
      assigneeIds: z.array(z.string().uuid()),
    });
    
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const { taskId } = await params;
    const supabase = createClient();
    const body = await request.json();
    
    const { assigneeIds } = assigneesSchema.parse(body);

    // First verify the task belongs to the user's workspace
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Úloha nebola nájdená" },
        { status: 404 }
      );
    }

    // First, delete all existing assignees for this task
    await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId)
      .eq("workspace_id", workspaceId);

    // Then, insert new assignees
    if (assigneeIds.length > 0) {
      // Get current user for assigned_by field
      const { data: { user } } = await supabase.auth.getUser();
      
      const assigneesToInsert = assigneeIds.map(userId => ({
        task_id: taskId,
        user_id: userId,
        workspace_id: workspaceId,
        assigned_by: user?.id || null,
      }));

      const { error: insertError } = await supabase
        .from("task_assignees")
        .insert(assigneesToInsert);

      if (insertError) {
        return NextResponse.json(
          { success: false, error: insertError.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating task assignees:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
