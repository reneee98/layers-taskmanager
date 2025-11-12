import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// GET - Get task by share token (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;
    
    if (!shareToken) {
      return NextResponse.json({
        success: false,
        error: "Share token is required"
      }, { status: 400 });
    }
    
    // Use service role client to bypass RLS for public access
    const supabase = createServiceClient();
    
    if (!supabase) {
      console.error("[Share API] Service client not available - check SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json({
        success: false,
        error: "Server configuration error"
      }, { status: 500 });
    }

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

    if (taskError) {
      console.error("[Share API] Error fetching task:", taskError);
      return NextResponse.json({ 
        success: false, 
        error: "Úloha nebola nájdená alebo nie je zdieľateľná" 
      }, { status: 404 });
    }
    
    if (!task) {
      console.log(`[Share API] Task not found for share token: ${shareToken}`);
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
    // Use service client which should bypass RLS
    console.log(`[Share API] Fetching comments for task ${taskId} using service client`);
    const { data: comments, error: commentsError, count } = await supabase
      .from("task_comments")
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id
      `, { count: 'exact' })
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    
    console.log(`[Share API] Query result - count: ${count}, data length: ${comments?.length || 0}, error:`, commentsError);

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
    }
    
    console.log(`[Share API] Found ${comments?.length || 0} comments for task ${taskId}`);
    if (comments && comments.length > 0) {
      console.log(`[Share API] Comment IDs:`, comments.map(c => ({ id: c.id, user_id: c.user_id })));
    }

    // Get user info for comments
    let commentsWithUsers: any[] = [];
    if (comments && comments.length > 0) {
      // Include ALL comments, even those without user_id
      const userIds = Array.from(new Set(comments.map(c => c.user_id).filter(Boolean)));
      console.log(`[Share API] Fetching profiles for ${userIds.length} unique user IDs:`, userIds);
      
      let userProfiles: any[] = [];
      if (userIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        } else {
          userProfiles = data || [];
        }
      }
      
      console.log(`[Share API] Found ${userProfiles.length} profiles`);

      // Map ALL comments, including those without user_id
      commentsWithUsers = comments.map(comment => {
        const user = comment.user_id ? userProfiles.find(p => p.id === comment.user_id) : null;
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
      
      console.log(`[Share API] Returning ${commentsWithUsers.length} comments with user info`);
      console.log(`[Share API] Comments with users:`, commentsWithUsers.map(c => ({ id: c.id, hasUser: !!c.user })));
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

