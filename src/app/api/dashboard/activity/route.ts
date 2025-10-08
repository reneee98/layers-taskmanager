import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Find user in users table by email
    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .single();

    if (dbUserError || !dbUser) {
      return NextResponse.json(
        { success: false, error: "Používateľ nebol nájdený v databáze" },
        { status: 404 }
      );
    }

    // Get recent activities from various sources
    const activities = [];

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
        user:users(name)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!timeError && timeEntries) {
      timeEntries.forEach(entry => {
        activities.push({
          id: `time_${entry.id}`,
          type: 'time_entry',
          action: 'Pridal čas',
          details: `${entry.hours}h na ${entry.task?.title || 'úlohu'}`,
          project: entry.task?.project?.name,
          project_code: entry.task?.project?.code,
          user: entry.user?.name || 'Neznámy',
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
      .order("updated_at", { ascending: false })
      .limit(10);

    if (!taskError && taskUpdates) {
      taskUpdates.forEach(task => {
        activities.push({
          id: `task_${task.id}`,
          type: 'task_update',
          action: 'Aktualizoval úlohu',
          details: task.title,
          project: task.project?.name,
          project_code: task.project?.code,
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
        user:users(name)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!commentError && comments) {
      comments.forEach(comment => {
        activities.push({
          id: `comment_${comment.id}`,
          type: 'comment',
          action: 'Pridal komentár',
          details: comment.task?.title || 'úlohu',
          project: comment.task?.project?.name,
          project_code: comment.task?.project?.code,
          user: comment.user?.name || 'Neznámy',
          created_at: comment.created_at,
          content: comment.content
        });
      });
    }

    // 4. Recent file uploads
    const { data: files, error: fileError } = await supabase
      .from("task_files")
      .select(`
        id,
        filename,
        created_at,
        task:tasks(title, project:projects(name, code)),
        user:users(name)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!fileError && files) {
      files.forEach(file => {
        activities.push({
          id: `file_${file.id}`,
          type: 'file_upload',
          action: 'Nahral súbor',
          details: file.filename,
          project: file.task?.project?.name,
          project_code: file.task?.project?.code,
          user: file.user?.name || 'Neznámy',
          created_at: file.created_at
        });
      });
    }

    // Sort all activities by created_at
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Take only the most recent 20 activities
    const recentActivities = activities.slice(0, 20);

    return NextResponse.json({
      success: true,
      data: recentActivities,
    });
  } catch (error) {
    console.error("Activity API error:", error);
    return NextResponse.json(
      { success: false, error: "Neznáma chyba" },
      { status: 500 }
    );
  }
}
