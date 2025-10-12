import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    console.log("GET /api/tasks/[taskId]/comments called with taskId:", params.taskId);
    
    const supabase = createClient();
    const user = await getServerUser();

    console.log("User:", user ? { id: user.id, email: user.email } : "null");

    if (!user) {
      console.log("No user found, returning 401");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching comments for task:", params.taskId);

    // First get comments
    const { data: comments, error: commentsError } = await supabase
      .from("task_comments")
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id
      `)
      .eq("task_id", params.taskId)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      return NextResponse.json({ success: false, error: `Failed to fetch comments: ${commentsError.message}` }, { status: 500 });
    }

    // Get current user info once
    const { data: currentUser } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .single();

    // Add user info to comments
    const commentsWithUsers = comments.map((comment) => ({
      ...comment,
      user: currentUser || { name: "Current User", email: user.email || "" }
    }));

    console.log("Comments fetched successfully:", commentsWithUsers);
    return NextResponse.json({ success: true, data: commentsWithUsers });
  } catch (error) {
    console.error("Error in comments GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    console.log("POST /api/tasks/[taskId]/comments called with taskId:", params.taskId);
    
    const supabase = createClient();
    console.log("Supabase client created");
    
    const user = await getServerUser();

    console.log("User:", user ? { id: user.id, email: user.email } : "null");

    if (!user) {
      console.log("No user found, returning 401");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Request body:", body);
    const { content } = body;

    if (!content || content.trim() === "") {
      console.log("No content provided");
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
    }

    console.log("Inserting comment with:", {
      task_id: params.taskId,
      user_id: user.id,
      content: content.trim()
    });

    const { data: comment, error } = await supabase
      .from("task_comments")
      .insert({
        task_id: params.taskId,
        user_id: user.id,
        content: content.trim()
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id
      `)
      .single();

    if (error) {
      console.error("Error creating comment:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json({ success: false, error: `Failed to create comment: ${error.message}` }, { status: 500 });
    }

    // Get current user info
    const { data: currentUser } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .single();

    const commentWithUser = {
      ...comment,
      user: currentUser || { name: "Current User", email: user.email || "" }
    };

    console.log("Comment created successfully:", commentWithUser);
    return NextResponse.json({ success: true, data: commentWithUser });
  } catch (error) {
    console.error("Error in comments POST:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
