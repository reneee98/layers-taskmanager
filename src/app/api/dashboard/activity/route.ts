import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    // Get workspace_id from request
    const workspaceId = await getUserWorkspaceIdFromRequest(req);
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID je povinný" },
        { status: 400 }
      );
    }

    // Find user in profiles table by id
    const { data: dbUser, error: dbUserError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (dbUserError || !dbUser) {
      return NextResponse.json(
        { success: false, error: "Používateľ nebol nájdený v databáze" },
        { status: 404 }
      );
    }

    // Get recent activities from various sources
    const activities: any[] = [];

    // 1. Recent time entries
    const { data: timeEntries, error: timeError } = await supabase
      .from("time_entries")
      .select(`
        id,
        hours,
        date,
        description,
        created_at,
        task:tasks(title, project:projects(name, code)),
        user:user_profiles(name)
      `)
      .eq("user_id", dbUser.id)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!timeError && timeEntries) {
      timeEntries.forEach(entry => {
        activities.push({
          id: `time_${entry.id}`,
          type: 'time_entry',
          action: 'Pridal čas',
          details: `${entry.hours}h na ${entry.task?.[0]?.title || 'úlohu'}`,
          project: entry.task?.[0]?.project?.[0]?.name,
          project_code: entry.task?.[0]?.project?.[0]?.code,
          user: entry.user?.[0]?.name || 'Neznámy',
          created_at: entry.created_at,
          description: entry.description
        });
      });
    }

    // 2. Recent task updates
    const { data: taskUpdates, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        status,
        priority,
        updated_at,
        project:projects(name, code)
      `)
      .eq("assignee_id", dbUser.id)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (!taskError && taskUpdates) {
      taskUpdates.forEach(task => {
        activities.push({
          id: `task_${task.id}`,
          type: 'task_update',
          action: 'Aktualizoval úlohu',
          details: task.title,
          project: task.project?.[0]?.name,
          project_code: task.project?.[0]?.code,
          user: 'Systém',
          created_at: task.updated_at,
          status: task.status,
          priority: task.priority
        });
      });
    }

    // 3. Recent comments
    const { data: comments, error: commentError } = await supabase
      .from("task_comments")
      .select(`
        id,
        content,
        created_at,
        task:tasks(title, project:projects(name, code)),
        user:user_profiles(name)
      `)
      .eq("user_id", dbUser.id)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!commentError && comments) {
      comments.forEach(comment => {
        activities.push({
          id: `comment_${comment.id}`,
          type: 'comment',
          action: 'Pridal komentár',
          details: comment.task?.[0]?.title || 'úlohu',
          project: comment.task?.[0]?.project?.[0]?.name,
          project_code: comment.task?.[0]?.project?.[0]?.code,
          user: comment.user?.[0]?.name || 'Neznámy',
          created_at: comment.created_at,
          content: comment.content
        });
      });
    }

    // Sort activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Activity API error:", error);
    return NextResponse.json(
      { success: false, error: "Neznáma chyba" },
      { status: 500 }
    );
  }
}