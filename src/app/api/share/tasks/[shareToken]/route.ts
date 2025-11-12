import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET - Get task by share token (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;
    const supabase = createClient();

    // Find task by share token
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        created_at,
        updated_at,
        estimated_hours
      `)
      .eq("share_token", shareToken)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ 
        success: false, 
        error: "Úloha nebola nájdená alebo nie je zdieľateľná" 
      }, { status: 404 });
    }

    const taskId = task.id;

    // Fetch checklist items
    const { data: checklistItems } = await supabase
      .from("task_checklist_items")
      .select("*")
      .eq("task_id", taskId)
      .order("position", { ascending: true });

    // Fetch comments with user info
    const { data: comments } = await supabase
      .from("task_comments")
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    // Get user info for comments
    let commentsWithUsers: any[] = [];
    if (comments && comments.length > 0) {
      const userIds = Array.from(new Set(comments.map(c => c.user_id)));
      const { data: userProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);

      commentsWithUsers = comments.map(comment => {
        const user = userProfiles?.find(p => p.id === comment.user_id);
        return {
          id: comment.id,
          content: comment.content,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          user: user ? {
            displayName: user.display_name,
            email: user.email
          } : null
        };
      });
    }

    // Fetch Google Drive links
    const { data: driveLinks } = await supabase
      .from("google_drive_links")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    // Fetch files (from storage)
    const { data: files } = await supabase.storage
      .from("task-files")
      .list(taskId, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" }
      });

    // Get signed URLs for files
    let filesWithUrls: any[] = [];
    if (files && files.length > 0) {
      filesWithUrls = await Promise.all(
        files.map(async (file) => {
          const { data: urlData } = await supabase.storage
            .from("task-files")
            .createSignedUrl(`${taskId}/${file.name}`, 3600);

          return {
            name: file.name,
            url: urlData?.signedUrl || null,
            size: file.metadata?.size || 0,
            type: file.metadata?.mimetype || "application/octet-stream",
            createdAt: file.created_at
          };
        })
      );
    }

    // Return all public-safe information
    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        estimatedHours: task.estimated_hours,
        checklist: checklistItems || [],
        comments: commentsWithUsers || [],
        links: driveLinks || [],
        files: filesWithUrls || []
      }
    });

  } catch (error) {
    console.error("Get shared task error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

