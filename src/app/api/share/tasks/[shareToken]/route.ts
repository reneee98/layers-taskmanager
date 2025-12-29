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

    // Fetch checklist items - ensure we only get items for this specific task
    // IMPORTANT: Only fetch non-deleted items (no deleted_at or similar flag)
    console.log(`[Share API] Fetching checklist items for task ${taskId} (shareToken: ${shareToken})`);
    const { data: checklistItems, error: checklistError } = await supabase
      .from("task_checklist_items")
      .select("id, task_id, text, completed, position, created_at, updated_at")
      .eq("task_id", taskId)
      .order("position", { ascending: true });
    
    if (checklistError) {
      console.error(`[Share API] Error fetching checklist items:`, checklistError);
    } else {
      console.log(`[Share API] Found ${checklistItems?.length || 0} checklist items for task ${taskId}`);
      if (checklistItems && checklistItems.length > 0) {
        console.log(`[Share API] Checklist items (FULL DATA):`, checklistItems.map(item => ({
          id: item.id,
          text: item.text,
          completed: item.completed,
          position: item.position,
          task_id: item.task_id,
          created_at: item.created_at,
          updated_at: item.updated_at
        })));
      }
    }

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
    console.log(`[Share API] Fetching Google Drive links for task ${taskId}`);
    const { data: driveLinks, error: driveLinksError } = await supabase
      .from("google_drive_links")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    
    if (driveLinksError) {
      console.error(`[Share API] Error fetching drive links:`, driveLinksError);
    } else {
      console.log(`[Share API] Found ${driveLinks?.length || 0} drive links`);
    }

    // Fetch files (from storage)
    console.log(`[Share API] Fetching files for task ${taskId}`);
    const { data: files, error: filesError } = await supabase.storage
      .from("task-files")
      .list(taskId, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" }
      });

    if (filesError) {
      console.error(`[Share API] Error listing files:`, filesError);
    } else {
      console.log(`[Share API] Found ${files?.length || 0} files in storage`);
    }

    // Get signed URLs for files
    let filesWithUrls: any[] = [];
    if (files && files.length > 0) {
      console.log(`[Share API] Generating signed URLs for ${files.length} files`);
      filesWithUrls = await Promise.all(
        files.map(async (file) => {
          try {
            const { data: urlData, error: urlError } = await supabase.storage
              .from("task-files")
              .createSignedUrl(`${taskId}/${file.name}`, 3600);

            if (urlError) {
              console.error(`[Share API] Error creating signed URL for ${file.name}:`, urlError);
              return {
                name: file.name,
                url: null,
                size: file.metadata?.size || 0,
                type: file.metadata?.mimetype || "application/octet-stream",
                createdAt: file.created_at
              };
            }

            return {
              name: file.name,
              url: urlData?.signedUrl || null,
              size: file.metadata?.size || 0,
              type: file.metadata?.mimetype || "application/octet-stream",
              createdAt: file.created_at
            };
          } catch (err) {
            console.error(`[Share API] Error processing file ${file.name}:`, err);
            return {
              name: file.name,
              url: null,
              size: file.metadata?.size || 0,
              type: file.metadata?.mimetype || "application/octet-stream",
              createdAt: file.created_at
            };
          }
        })
      );
      console.log(`[Share API] Generated ${filesWithUrls.filter(f => f.url).length} signed URLs`);
    }

    // Log summary before returning
    console.log(`[Share API] Returning task data:`, {
      taskId: task.id,
      title: task.title,
      checklistCount: checklistItems?.length || 0,
      commentsCount: commentsWithUsers?.length || 0,
      linksCount: driveLinks?.length || 0,
      filesCount: filesWithUrls?.length || 0,
      updatedAt: task.updated_at
    });

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
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
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

