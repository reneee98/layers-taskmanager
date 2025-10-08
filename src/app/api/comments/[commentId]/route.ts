import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateCommentSchema = z.object({
  content: z.string().min(1, "Komentár nemôže byť prázdny"),
  content_html: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateCommentSchema.parse(body);

    // Check if comment exists and user owns it
    const { data: existingComment, error: fetchError } = await supabase
      .from("task_comments")
      .select("*")
      .eq("id", params.commentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
    }

    const { data: comment, error } = await supabase
      .from("task_comments")
      .update({
        content: validatedData.content,
        content_html: validatedData.content_html,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.commentId)
      .select(`
        *,
        user:user_profiles!task_comments_user_id_fkey(
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      console.error("Error updating comment:", error);
      return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
    }

    return NextResponse.json({ data: comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error in PUT /api/comments/[commentId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if comment exists and user owns it
    const { data: existingComment, error: fetchError } = await supabase
      .from("task_comments")
      .select("*")
      .eq("id", params.commentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
    }

    const { error } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", params.commentId);

    if (error) {
      console.error("Error deleting comment:", error);
      return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Error in DELETE /api/comments/[commentId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
