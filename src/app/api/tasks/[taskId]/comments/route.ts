import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";
import { logActivity, ActivityTypes, getUserDisplayName, getTaskTitle } from "@/lib/activity-logger";
import { getUserWorkspaceId } from "@/lib/auth/workspace";

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

    // Get user info for all comment authors
    const userIds = Array.from(new Set(comments.map(comment => comment.user_id)));
    const { data: userProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);

    // Add user info to comments
    const commentsWithUsers = comments.map((comment) => {
      const userProfile = userProfiles?.find(profile => profile.id === comment.user_id);
      return {
        ...comment,
        user: userProfile ? { 
          name: userProfile.display_name || "User", 
          email: userProfile.email || "" 
        } : { name: "Unknown User", email: "" }
      };
    });

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
    
    // Get user first
    const user = await getServerUser();
    console.log("User in POST:", user);
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user's workspace ID - temporary hardcoded for testing
    const workspaceId = "6dd7d31a-3d36-4d92-a8eb-7146703a00b0";
    console.log("Workspace ID:", workspaceId);
    
    const supabase = createClient();
    console.log("Supabase client created");

    console.log("User:", user ? { id: user.id, email: user.email } : "null");

    const body = await request.json();
    console.log("Request body:", body);
    const { content } = body;

    if (!content || content.trim() === "") {
      console.log("No content provided");
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
    }

    // Get task info for activity logging
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("title, project_id")
      .eq("id", params.taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
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
        content: content.trim(),
        workspace_id: workspaceId
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

    // Log activity - comment added
    const userDisplayName = await getUserDisplayName(user.id);
    await logActivity({
      workspaceId,
      userId: user.id,
      type: ActivityTypes.COMMENT_ADDED,
      action: `Pridal komentár`,
      details: task.title,
      projectId: task.project_id,
      taskId: params.taskId,
      metadata: {
        comment_id: comment.id,
        comment_content: content.trim(),
        user_display_name: userDisplayName
      }
    });

    // Get current user info
    const { data: currentUser } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .single();

    const commentWithUser = {
      ...comment,
      user: currentUser ? { 
        name: currentUser.display_name || "User", 
        email: currentUser.email || user.email || "" 
      } : { name: "Current User", email: user.email || "" }
    };

    console.log("Comment created successfully:", commentWithUser);
    return NextResponse.json({ success: true, data: commentWithUser });
  } catch (error) {
    console.error("Error in comments POST:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
