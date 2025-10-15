import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";
import { logActivity, ActivityTypes, getUserDisplayName, getTaskTitle } from "@/lib/activity-logger";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get active timer for current user with task info
    const { data: activeTimer, error: fetchError } = await supabase
      .from("task_timers")
      .select(`
        id,
        task_id,
        workspace_id,
        started_at,
        tasks!inner(
          title,
          project_id,
          projects!inner(
            name
          )
        )
      `)
      .eq("user_id", user.id)
      .is("stopped_at", null)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        // No active timer found
        return NextResponse.json({ success: false, error: "No active timer found" }, { status: 404 });
      }
      console.error("Error fetching active timer:", fetchError);
      return NextResponse.json({ success: false, error: "Failed to fetch active timer" }, { status: 500 });
    }

    // Use the database function to stop timer
    const { data: success, error } = await supabase.rpc("stop_timer", {
      p_timer_id: activeTimer.id,
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error stopping timer:", error);
      return NextResponse.json({ success: false, error: "Failed to stop timer" }, { status: 500 });
    }

    if (!success) {
      return NextResponse.json({ success: false, error: "Failed to stop timer" }, { status: 500 });
    }

    // Log activity - timer stopped
    const userDisplayName = await getUserDisplayName(user.id);
    const taskTitle = (activeTimer.tasks as any)?.title || "Neznáma úloha";
    const projectName = (activeTimer.tasks as any)?.projects?.name || "Neznámy projekt";
    const projectId = (activeTimer.tasks as any)?.project_id;
    
    // Calculate duration
    const startedAt = new Date(activeTimer.started_at);
    const stoppedAt = new Date();
    const duration = Math.floor((stoppedAt.getTime() - startedAt.getTime()) / 1000);
    const durationHours = (duration / 3600).toFixed(2);

    await logActivity({
      workspaceId: activeTimer.workspace_id,
      userId: user.id,
      type: ActivityTypes.TIMER_STOPPED,
      action: `Zastavil timer (${durationHours}h)`,
      details: taskTitle,
      projectId: projectId,
      taskId: activeTimer.task_id,
      metadata: {
        timer_id: activeTimer.id,
        task_name: taskTitle,
        project_name: projectName,
        started_at: activeTimer.started_at,
        stopped_at: stoppedAt.toISOString(),
        duration_seconds: duration,
        duration_hours: durationHours,
        user_display_name: userDisplayName
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in stop timer POST:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
