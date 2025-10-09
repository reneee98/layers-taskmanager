import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";

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

    // Check if comment exists and user owns it
    const { data: comment, error: fetchError } = await supabase
      .from("task_comments")
      .select("id, user_id")
      .eq("id", params.commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ success: false, error: "Comment not found" }, { status: 404 });
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized to delete this comment" }, { status: 403 });
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
