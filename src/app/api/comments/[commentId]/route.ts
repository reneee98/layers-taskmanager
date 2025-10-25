import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";
import { getUserWorkspaceId } from "@/lib/auth/workspace";

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
      .select("id, user_id, workspace_id")
      .eq("id", params.commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ success: false, error: "Comment not found" }, { status: 404 });
    }

    // Check workspace access if comment has workspace_id
    if (comment.workspace_id) {
      const userWorkspaceId = await getUserWorkspaceId();
      if (userWorkspaceId !== comment.workspace_id) {
        return NextResponse.json({ success: false, error: "Unauthorized to delete this comment" }, { status: 403 });
      }

      // Check if user is workspace owner
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", comment.workspace_id)
        .single();

      if (workspaceError || !workspace) {
        return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
      }

      // Allow deletion if user is comment author OR workspace owner
      if (comment.user_id !== user.id && workspace.owner_id !== user.id) {
        return NextResponse.json({ success: false, error: "Unauthorized to delete this comment" }, { status: 403 });
      }
    } else {
      // If no workspace_id, only allow comment author to delete
      if (comment.user_id !== user.id) {
        return NextResponse.json({ success: false, error: "Unauthorized to delete this comment" }, { status: 403 });
      }
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
