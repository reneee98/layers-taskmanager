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
        // No active timer found
        return NextResponse.json({ success: false, error: "No active timer found" }, { status: 404 });
      }
      console.error("Error fetching active timer:", fetchError);
      return NextResponse.json({ success: false, error: "Failed to fetch active timer" }, { status: 500 });
    }

    const task = activeTimer.tasks as any;
    const taskTitle = task?.title || "Neznáma úloha";
    const projectId = task?.project_id;
    const projectName = task?.projects?.name || "";
    
    // Calculate duration
    const startedAt = new Date(activeTimer.started_at);
    const stoppedAt = new Date();
    const duration = Math.floor((stoppedAt.getTime() - startedAt.getTime()) / 1000);
    
    if (duration <= 0) {
      // Timer was just started or has no duration, just stop it
      const { data: success, error } = await supabase.rpc("stop_timer", {
        p_timer_id: activeTimer.id,
        p_user_id: user.id,
      });

      if (error || !success) {
        console.error("Error stopping timer:", error);
        return NextResponse.json({ success: false, error: "Failed to stop timer" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Timer stopped (no time to save)" });
    }

    const trackedHours = Number((duration / 3600).toFixed(3));
    const startTime = startedAt.toTimeString().slice(0, 8); // HH:mm:ss
    const endTime = stoppedAt.toTimeString().slice(0, 8); // HH:mm:ss
    const date = stoppedAt.toISOString().split("T")[0]; // YYYY-MM-DD

    // Get task details for hourly rate calculation
    const { data: taskDetails, error: taskError } = await supabase
      .from("tasks")
      .select("project_id, estimated_hours, budget_cents, actual_hours, hourly_rate_cents")
      .eq("id", activeTimer.task_id)
      .eq("workspace_id", activeTimer.workspace_id)
      .single();

    if (taskError || !taskDetails) {
      console.error("Error fetching task details:", taskError);
      return NextResponse.json({ success: false, error: "Failed to fetch task details" }, { status: 500 });
    }

    // Resolve hourly rate (similar logic to time entry endpoint)
    let hourlyRate = 0;
    let rateSource = "fallback";

    if (taskDetails.project_id) {
      // Priority 1: Check project_members.hourly_rate
      const { data: projectMember } = await supabase
        .from("project_members")
        .select("hourly_rate")
        .eq("project_id", taskDetails.project_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (projectMember?.hourly_rate != null) {
        hourlyRate = Number(projectMember.hourly_rate);
        rateSource = "project_member";
      } else {
        // Priority 2: Check projects.hourly_rate_cents
        const { data: project } = await supabase
          .from("projects")
          .select("hourly_rate_cents")
          .eq("id", taskDetails.project_id)
          .maybeSingle();

        if (project?.hourly_rate_cents != null) {
          hourlyRate = Number(project.hourly_rate_cents) / 100;
          rateSource = "project";
        } else {
          // Priority 3: Check rates table
          const today = new Date().toISOString().split("T")[0];
          const { data: rates } = await supabase
            .from("rates")
            .select("id, name, hourly_rate, user_id, project_id, valid_from, valid_to, is_default")
            .or(`user_id.eq.${user.id},project_id.eq.${taskDetails.project_id}`)
            .lte("valid_from", today)
            .or(`valid_to.is.null,valid_to.gte.${today}`)
            .order("is_default", { ascending: false })
            .order("valid_from", { ascending: false });

          if (rates && rates.length > 0) {
            const userRate = rates.find((r) => r.user_id === user.id);
            const rate = userRate || rates[0];
            hourlyRate = Number(rate.hourly_rate);
            rateSource = "rates_table";
          }
        }
      }
    } else {
      // Task has no project - Priority 1: Check task.hourly_rate_cents
      if (taskDetails.hourly_rate_cents != null && taskDetails.hourly_rate_cents > 0) {
        hourlyRate = Number(taskDetails.hourly_rate_cents) / 100;
        rateSource = "task";
      } else {
        // Priority 2: Check rates table for user rates only
        const today = new Date().toISOString().split("T")[0];
        const { data: rates } = await supabase
          .from("rates")
          .select("id, name, hourly_rate, user_id, project_id, valid_from, valid_to, is_default")
          .eq("user_id", user.id)
          .lte("valid_from", today)
          .or(`valid_to.is.null,valid_to.gte.${today}`)
          .order("is_default", { ascending: false })
          .order("valid_from", { ascending: false });

        if (rates && rates.length > 0) {
          const rate = rates[0];
          hourlyRate = Number(rate.hourly_rate);
          rateSource = "rates_table";
        } else {
          // Priority 3: Check user_settings.default_hourly_rate
          const { data: userSettings } = await supabase
            .from("user_settings")
            .select("default_hourly_rate")
            .eq("user_id", user.id)
            .single();

          if (userSettings?.default_hourly_rate != null) {
            hourlyRate = Number(userSettings.default_hourly_rate);
            rateSource = "user_settings";
          }
        }
      }
    }

    // Calculate budget and amount (similar to time entry endpoint)
    let budgetHoursLimit = 0;
    let budgetAmount = 0;
    
    if (taskDetails.budget_cents && taskDetails.budget_cents > 0 && hourlyRate && hourlyRate > 0) {
      budgetAmount = taskDetails.budget_cents / 100;
      budgetHoursLimit = budgetAmount / hourlyRate;
    } else if (taskDetails.estimated_hours && taskDetails.estimated_hours > 0) {
      budgetHoursLimit = taskDetails.estimated_hours;
    }

    const currentActualHours = taskDetails.actual_hours || 0;
    const hoursWithinBudget = Math.max(0, Math.min(currentActualHours, budgetHoursLimit));
    const remainingBudgetHours = Math.max(0, budgetHoursLimit - hoursWithinBudget);
    const newHoursWithinBudget = Math.min(trackedHours, remainingBudgetHours);
    const hoursOverBudget = Math.max(0, trackedHours - newHoursWithinBudget);
    const amount = hoursOverBudget * hourlyRate;

    // Check if timer was already stopped (race condition protection)
    const { data: timerCheck, error: timerCheckError } = await supabase
      .from("task_timers")
      .select("stopped_at")
      .eq("id", activeTimer.id)
      .single();

    if (timerCheckError) {
      console.error("Error checking timer status:", timerCheckError);
      return NextResponse.json({ success: false, error: "Failed to verify timer status" }, { status: 500 });
    }

    // If timer is already stopped, don't create duplicate time entry
    if (timerCheck.stopped_at) {
      console.log("Timer already stopped, skipping time entry creation");
      return NextResponse.json({ 
        success: true, 
        message: "Timer was already stopped",
        data: {
          duration: duration,
          hours: trackedHours
        }
      });
    }

    // Create time entry
    const timeEntryData: any = {
      task_id: activeTimer.task_id,
      user_id: user.id,
      hours: trackedHours,
      date: date,
      description: "",
      hourly_rate: hourlyRate,
      amount: amount,
      is_billable: true,
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
      return NextResponse.json({ success: false, error: `Failed to save time entry: ${insertError.message}` }, { status: 500 });
    }

    // Update task actual_hours
    const { error: updateTaskError } = await supabase.rpc(
      "update_task_actual_hours",
      { task_id: activeTimer.task_id }
    );

    if (updateTaskError) {
      console.warn("Failed to update task actual_hours:", updateTaskError);
    }

    // Now stop the timer
    const { data: success, error: stopError } = await supabase.rpc("stop_timer", {
      p_timer_id: activeTimer.id,
      p_user_id: user.id,
    });

    if (stopError || !success) {
      console.error("Error stopping timer:", stopError);
      // Time entry was already saved, so we still return success
      console.warn("Time entry was saved but timer stop failed");
    }

    // Log activity - timer stopped
    const userDisplayName = await getUserDisplayName(user.id);
    const durationHours = (duration / 3600).toFixed(2);

    await logActivity({
      workspaceId: activeTimer.workspace_id,
      userId: user.id,
      type: ActivityTypes.TIMER_STOPPED,
      action: `Zastavil timer a uložil ${durationHours}h`,
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
        time_entry_id: timeEntry.id,
        hours: trackedHours,
        amount: amount,
        hourly_rate: hourlyRate,
        rate_source: rateSource,
        user_display_name: userDisplayName
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        timeEntry,
        duration: duration,
        hours: trackedHours
      }
    });
  } catch (error) {
    console.error("Error in stop timer POST:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
