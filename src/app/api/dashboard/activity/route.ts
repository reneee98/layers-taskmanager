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
        user:users(name)
      `)
      .eq("user_id", dbUser.id)
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