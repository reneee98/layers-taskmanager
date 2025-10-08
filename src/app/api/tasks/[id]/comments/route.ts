import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(1, "Komentár nemôže byť prázdny"),
  content_html: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: comments, error } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", params.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }

    // Get user profiles for all comments
    const userIds = [...new Set(comments?.map(comment => comment.user_id) || [])];
    const { data: userProfiles } = await supabase
      .from("user_profiles")
      .select("id, name, email, role")
      .in("id", userIds);

    const userMap = new Map(userProfiles?.map(profile => [profile.id, profile]) || []);

    // Organize comments into threads (parent comments and their replies)
    const parentComments = comments?.filter(comment => !comment.parent_id) || [];
    const replies = comments?.filter(comment => comment.parent_id) || [];

    const commentsWithReplies = parentComments.map(comment => ({
      ...comment,
      user: userMap.get(comment.user_id) || { id: comment.user_id, name: "Neznámy používateľ", email: "", role: "designer" },
      replies: replies.filter(reply => reply.parent_id === comment.id).map(reply => ({
        ...reply,
        user: userMap.get(reply.user_id) || { id: reply.user_id, name: "Neznámy používateľ", email: "", role: "designer" }
      }))
    }));

    return NextResponse.json({ data: commentsWithReplies });
  } catch (error) {
    console.error("Error in GET /api/tasks/[taskId]/comments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    const { data: comment, error } = await supabase
      .from("task_comments")
      .insert({
        task_id: params.id,
        user_id: user.id,
        content: validatedData.content,
        content_html: validatedData.content_html,
        parent_id: validatedData.parent_id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating comment:", error);
      return NextResponse.json({ 
        error: "Failed to create comment", 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ data: comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json({ 
        error: "Validation failed", 
        details: error.errors[0].message 
      }, { status: 400 });
    }
    console.error("Error in POST /api/tasks/[taskId]/comments:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
