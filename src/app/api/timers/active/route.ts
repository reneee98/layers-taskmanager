import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get active timer for current user
    // First get timer without joins to avoid RLS issues
    // Try to select is_extra, but handle case where column doesn't exist yet
    const { data: timer, error } = await supabase
      .from("task_timers")
      .select("id, task_id, started_at")
      .eq("user_id", user.id)
      .is("stopped_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No active timer found
        return NextResponse.json({ success: true, data: null });
      }
      console.error("Error fetching active timer:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch active timer" }, { status: 500 });
    }

    if (!timer) {
      return NextResponse.json({ success: true, data: null });
    }

    // Now get task details separately
    const { data: taskData } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        project_id,
        projects:project_id(
          id,
          name
        )
      `)
      .eq("id", timer.task_id)
      .single();

    // Calculate duration
    const startedAt = new Date(timer.started_at);
    const now = new Date();
    const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    // Try to get is_extra and description separately if columns exist
    let isExtra = false;
    let description = "";
    try {
      const { data: timerWithExtra } = await supabase
        .from("task_timers")
        .select("is_extra, description")
        .eq("id", timer.id)
        .single();
      isExtra = timerWithExtra?.is_extra || false;
      description = timerWithExtra?.description || "";
    } catch (e) {
      // Columns don't exist yet, use defaults
      isExtra = false;
      description = "";
    }

    const activeTimer = {
      id: timer.id,
      task_id: timer.task_id,
      task_name: taskData?.title || 'Unknown Task',
      project_name: (taskData?.projects as any)?.name || '',
      project_id: taskData?.project_id || '',
      started_at: timer.started_at,
      duration,
      is_extra: isExtra,
      description,
    };

    return NextResponse.json({ success: true, data: activeTimer });
  } catch (error) {
    console.error("Error in active timer GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
