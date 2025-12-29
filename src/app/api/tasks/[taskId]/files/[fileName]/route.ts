import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; fileName: string }> }
) {
  try {
    const { taskId, fileName } = await params;
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Verify task access
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
    }

    // Delete file from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from("task-files")
      .remove([`${taskId}/${fileName}`]);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return NextResponse.json({ success: false, error: "Nepodarilo sa vymazať súbor" }, { status: 500 });
    }

    // Update task's updated_at timestamp to trigger realtime updates
    await supabase
      .from("tasks")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("workspace_id", workspaceId);

    return NextResponse.json({
      success: true,
      data: { message: "Súbor bol vymazaný" }
    });

  } catch (error) {
    console.error("File delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
