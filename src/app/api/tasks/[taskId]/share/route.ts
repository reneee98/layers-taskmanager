import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

// GET - Get share token for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Verify task access
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, share_token")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
    }

    // Check if user has access to this task's workspace
    const { data: taskWorkspace } = await supabase
      .from("tasks")
      .select(`
        id,
        project:projects!inner(workspace_id)
      `)
      .eq("id", taskId)
      .single();

    if (!taskWorkspace || (taskWorkspace.project as any)?.workspace_id !== workspaceId) {
      return NextResponse.json({ success: false, error: "Nemáte oprávnenie" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        shareToken: task.share_token,
        shareUrl: task.share_token 
          ? `${request.nextUrl.origin}/share/tasks/${task.share_token}`
          : null
      }
    });

  } catch (error) {
    console.error("Get share token error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Generate or regenerate share token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Verify task access and get workspace
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id,
        project_id,
        project:projects(workspace_id)
      `)
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
    }

    // If task has a project, check workspace access
    if (task.project_id && (task.project as any)?.workspace_id) {
      const taskWorkspaceId = (task.project as any).workspace_id;
      if (taskWorkspaceId !== workspaceId) {
        return NextResponse.json({ success: false, error: "Nemáte oprávnenie" }, { status: 403 });
      }
    } else {
      // Task without project - check if user has access to workspace
      // For now, allow if user is in the workspace (basic check)
      // You might want to add more specific logic here
    }

    // Generate new share token using the database function
    const { data: tokenData, error: tokenError } = await supabase.rpc('generate_share_token');
    
    if (tokenError || !tokenData) {
      console.error("Token generation error:", tokenError);
      // Fallback: generate token in JavaScript if RPC fails
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      let fallbackToken = '';
      for (let i = 0; i < 32; i++) {
        fallbackToken += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const { data: updatedTask, error: updateError } = await supabase
        .from("tasks")
        .update({ share_token: fallbackToken })
        .eq("id", taskId)
        .select("share_token")
        .single();
      
      if (updateError || !updatedTask) {
        console.error("Update error:", updateError);
        return NextResponse.json({ success: false, error: "Nepodarilo sa uložiť token" }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          shareToken: updatedTask.share_token,
          shareUrl: `${request.nextUrl.origin}/share/tasks/${updatedTask.share_token}`
        }
      });
    }

    // Update task with share token
    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({ share_token: tokenData })
      .eq("id", taskId)
      .select("share_token")
      .single();

    if (updateError || !updatedTask) {
      console.error("Update error:", updateError);
      return NextResponse.json({ success: false, error: "Nepodarilo sa uložiť token" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        shareToken: updatedTask.share_token,
        shareUrl: `${request.nextUrl.origin}/share/tasks/${updatedTask.share_token}`
      }
    });

  } catch (error) {
    console.error("Generate share token error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove share token (disable sharing)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Verify task access
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id,
        project_id,
        project:projects(workspace_id)
      `)
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
    }

    // If task has a project, check workspace access
    if (task.project_id && (task.project as any)?.workspace_id) {
      const taskWorkspaceId = (task.project as any).workspace_id;
      if (taskWorkspaceId !== workspaceId) {
        return NextResponse.json({ success: false, error: "Nemáte oprávnenie" }, { status: 403 });
      }
    }
    // Task without project - allow if user is in the workspace

    // Remove share token
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ share_token: null })
      .eq("id", taskId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ success: false, error: "Nepodarilo sa odstrániť token" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { message: "Zdieľanie bolo deaktivované" }
    });

  } catch (error) {
    console.error("Delete share token error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

