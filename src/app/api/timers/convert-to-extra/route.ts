import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";
import { logActivity, ActivityTypes, getUserDisplayName, getTaskTitle } from "@/lib/activity-logger";

/**
 * Convert active timer to extra time
 * Stops the current timer and saves it as extra (non-billable) time
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get active timer for current user
    const { data: activeTimer, error: fetchError } = await supabase
      .from("task_timers")
      .select(`
        id,
        task_id,
        workspace_id,
        started_at,
        tasks(
          title,
          project_id,
          estimated_hours,
          budget_cents,
          actual_hours,
          projects(
            name,
            hourly_rate_cents
          )
        )
      `)
      .eq("user_id", user.id)
      .is("stopped_at", null)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ success: false, error: "No active timer found" }, { status: 404 });
      }
      console.error("Error fetching active timer:", fetchError);
      return NextResponse.json({ success: false, error: "Failed to fetch active timer" }, { status: 500 });
    }

    if (!activeTimer) {
      return NextResponse.json({ success: false, error: "No active timer found" }, { status: 404 });
    }

    const taskDetails = (activeTimer.tasks as any);
    if (!taskDetails) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    // Calculate duration
    const startedAt = new Date(activeTimer.started_at);
    const stoppedAt = new Date();
    const duration = Math.floor((stoppedAt.getTime() - startedAt.getTime()) / 1000);
    
    if (duration <= 0) {
      // Just stop the timer without creating time entry
      const { error: stopError } = await supabase
        .from("task_timers")
        .update({ stopped_at: stoppedAt.toISOString() })
        .eq("id", activeTimer.id);

      if (stopError) {
        return NextResponse.json({ success: false, error: "Failed to stop timer" }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Timer stopped (no duration)",
        data: { duration: 0, hours: 0 }
      });
    }

    const trackedHours = Number((duration / 3600).toFixed(3));
    const date = startedAt.toISOString().split('T')[0];
    const startTime = startedAt.toISOString();
    const endTime = stoppedAt.toISOString();

    // Get hourly rate
    let hourlyRate = 0;
    if (taskDetails.projects?.hourly_rate_cents) {
      hourlyRate = taskDetails.projects.hourly_rate_cents / 100;
    }

    // Stop the timer first
    const { error: stopError } = await supabase
      .from("task_timers")
      .update({ stopped_at: stoppedAt.toISOString() })
      .eq("id", activeTimer.id);

    if (stopError) {
      return NextResponse.json({ success: false, error: "Failed to stop timer" }, { status: 500 });
    }

    // Create time entry as EXTRA (non-billable, amount = 0)
    const timeEntryData: any = {
      task_id: activeTimer.task_id,
      user_id: user.id,
      hours: trackedHours,
      date: date,
      description: "",
      hourly_rate: hourlyRate,
      amount: 0, // Extra time has no cost
      is_billable: false, // Extra time is not billable
      start_time: startTime,
      end_time: endTime,
      workspace_id: activeTimer.workspace_id,
    };

    // Only add project_id if task has a project
    if (taskDetails.project_id) {
      timeEntryData.project_id = taskDetails.project_id;
    }

    const { data: timeEntry, error: insertError } = await supabase
      .from("time_entries")
      .insert(timeEntryData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating time entry:", insertError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create time entry",
        details: insertError.message 
      }, { status: 500 });
    }

    // Update task actual_hours
    const { error: updateTaskError } = await supabase.rpc(
      "update_task_actual_hours",
      { task_id: activeTimer.task_id }
    );

    if (updateTaskError) {
      console.warn("Failed to update task actual_hours:", updateTaskError);
    }

    // Log activity
    const userDisplayName = await getUserDisplayName(user.id);
    const taskTitle = await getTaskTitle(activeTimer.task_id);
    await logActivity({
      workspaceId: activeTimer.workspace_id,
      userId: user.id,
      type: ActivityTypes.TIMER_STOPPED,
      action: `Zastavil časovač a uložil ako extra čas`,
      details: taskTitle,
      projectId: taskDetails.project_id,
      taskId: activeTimer.task_id,
      metadata: {
        timer_id: activeTimer.id,
        duration: duration,
        hours: trackedHours,
        is_extra: true,
        user_display_name: userDisplayName
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Timer converted to extra time",
      data: {
        duration,
        hours: trackedHours,
        timeEntry
      }
    });
  } catch (error: any) {
    console.error("Error in convert-to-extra POST:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}


