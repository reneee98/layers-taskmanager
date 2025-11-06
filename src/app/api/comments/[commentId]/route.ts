import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const supabase = createClient();
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if comment exists
    const { data: comment, error: fetchError } = await supabase
      .from("task_comments")
      .select("id, user_id, task_id")
      .eq("id", params.commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ success: false, error: "Comment not found" }, { status: 404 });
    }

    // Get task to find project and workspace
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("project_id")
      .eq("id", comment.task_id)
      .single();

    if (taskError || !task || !task.project_id) {
      return NextResponse.json({ success: false, error: "Task not found for this comment" }, { status: 404 });
    }

    // Get project to find workspace
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", task.project_id)
      .single();

    if (projectError || !project || !project.workspace_id) {
      return NextResponse.json({ success: false, error: "Workspace not found for this comment" }, { status: 404 });
    }

    const workspaceId = project.workspace_id;

    // Check permissions:
    // 1. User can delete their own comment if they have 'comments.delete' permission
    // 2. User can delete any comment if they have 'comments.manage' permission
    const isOwnComment = comment.user_id === user.id;
    const canDeleteOwn = isOwnComment && await hasPermission(user.id, 'comments', 'delete', workspaceId);
    const canManageAll = await hasPermission(user.id, 'comments', 'manage', workspaceId);

    if (!canDeleteOwn && !canManageAll) {
      return NextResponse.json({ 
        success: false, 
        error: "Nemáte oprávnenie na vymazanie tohto komentára" 
      }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", params.commentId);

    if (deleteError) {
      console.error("Error deleting comment:", deleteError);
      return NextResponse.json({ success: false, error: "Failed to delete comment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in comment DELETE:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
