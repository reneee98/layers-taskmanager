import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: "Chýbajú povinné parametre" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // SECURITY: Check if user is owner of the workspace
    // Only workspace owners can manage invoices
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    // Check if user is owner (either workspace owner or has owner role)
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    const isOwner = workspace.owner_id === user.id || member?.role === 'owner';

    if (!user || !isOwner) {
      console.log(`SECURITY: User ${user?.email} is not owner of workspace ${workspaceId}, blocking access to invoices`);
      return NextResponse.json({ success: false, error: "Access denied - only workspace owners can manage invoices" }, { status: 403 });
    }

    if (type === 'project') {
      // Mark all done tasks in the project as invoiced (filtered by workspace)
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id")
        .eq("project_id", id)
        .eq("workspace_id", workspaceId)
        .eq("status", "done");

      if (tasksError) {
        return NextResponse.json(
          { success: false, error: tasksError.message },
          { status: 500 }
        );
      }

      if (tasks.length === 0) {
        return NextResponse.json(
          { success: false, error: "Projekt nemá dokončené úlohy" },
          { status: 400 }
        );
      }

      // Update all done tasks to invoiced status
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ 
          status: "invoiced",
          invoiced_at: new Date().toISOString()
        })
        .in("id", tasks.map(t => t.id));

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }

    } else if (type === 'task') {
      // Mark single task as invoiced (filtered by workspace)
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ 
          status: "invoiced",
          invoiced_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .eq("status", "done");

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }

    } else {
      return NextResponse.json(
        { success: false, error: "Neplatný typ" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'project' ? 'Projekt' : 'Úloha'} bola označená ako vyfaktúrovaná`,
    });

  } catch (error) {
    console.error("Error marking as invoiced:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
