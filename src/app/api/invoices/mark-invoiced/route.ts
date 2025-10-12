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
