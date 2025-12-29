import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; assigneeId: string }> }
) {
  try {
    const { taskId, assigneeId } = await params;
    const supabase = createClient();
    
    // Get workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Verify task belongs to workspace
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Úloha nebola nájdená" },
        { status: 404 }
      );
    }

    // Get request body
    const body = await request.json();
    const { hourly_rate_cents } = body;

    // Update assignee
    const { data, error } = await supabase
      .from("task_assignees")
      .update({
        hourly_rate_cents: hourly_rate_cents !== undefined ? hourly_rate_cents : null,
      })
      .eq("id", assigneeId)
      .eq("task_id", taskId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update assignee:", error);
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa aktualizovať priradenie" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error updating assignee:", error);
    return NextResponse.json(
      { success: false, error: "Vnútorná chyba servera" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; assigneeId: string }> }
) {
  try {
    const { taskId, assigneeId } = await params;
    const supabase = createClient();

    const { error } = await supabase
      .from("task_assignees")
      .delete()
      .eq("id", assigneeId)
      .eq("task_id", taskId);

    if (error) {
      console.error("Failed to remove assignee:", error);
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa odstrániť priradenie" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing assignee:", error);
    return NextResponse.json(
      { success: false, error: "Vnútorná chyba servera" },
      { status: 500 }
    );
  }
}
