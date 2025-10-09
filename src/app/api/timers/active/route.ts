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
    const { data: timer, error } = await supabase
      .from("task_timers")
      .select(`
        id,
        task_id,
        started_at,
        tasks!inner(
          id,
          title,
          projects!inner(
            id,
            name
          )
        )
      `)
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

    // Calculate duration
    const startedAt = new Date(timer.started_at);
    const now = new Date();
    const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    const activeTimer = {
      id: timer.id,
      task_id: timer.task_id,
      task_name: timer.tasks[0]?.title || 'Unknown Task',
      project_name: timer.tasks[0]?.projects[0]?.name || 'Unknown Project',
      project_id: timer.tasks[0]?.projects[0]?.id || '',
      started_at: timer.started_at,
      duration,
    };

    return NextResponse.json({ success: true, data: activeTimer });
  } catch (error) {
    console.error("Error in active timer GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
