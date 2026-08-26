import { NextRequest, NextResponse } from "next/server";
import { logActivity, ActivityTypes, getUserDisplayName } from "@/lib/activity-logger";
import { getAuthenticatedRequestContext } from "@/lib/supabase/request";
import { createClient as createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  try {
    const { supabase: authenticatedSupabase, user } = await getAuthenticatedRequestContext(request);

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify identity with the user's session, then use canonical service-role
    // reads/writes scoped to that user. This avoids stale RLS snapshots shared
    // by long-lived web and desktop sessions.
    const supabase = createServiceClient({ noStore: true }) ?? authenticatedSupabase;

    let requestedTimerId: string | null = null;
    try {
      const body = await request.json();
      const timerId = body?.timerId ?? body?.timer_id;
      requestedTimerId = typeof timerId === "string" && timerId.trim() ? timerId.trim() : null;
    } catch {
      // Older web/native clients send no body. Fall back to the latest active timer.
    }

    // Keep timer lookup independent from task/project visibility. This also
    // matches the reliable lookup used by the active-timer endpoint.
    let activeTimerQuery = supabase
      .from("task_timers")
      .select("id, task_id, workspace_id, started_at")
      .eq("user_id", user.id)
      .is("stopped_at", null);

    if (requestedTimerId) {
      activeTimerQuery = activeTimerQuery.eq("id", requestedTimerId);
    } else {
      activeTimerQuery = activeTimerQuery
        .order("started_at", { ascending: false })
        .limit(1);
    }

    let { data: activeTimer, error: fetchError } = await activeTimerQuery.maybeSingle();

    // A client can briefly hold the previous timer id while another tab starts
    // a new timer. Preserve the endpoint's original "stop my active timer"
    // semantics by falling back to the authenticated user's latest timer.
    if (!fetchError && !activeTimer && requestedTimerId) {
      const fallbackResult = await supabase
        .from("task_timers")
        .select("id, task_id, workspace_id, started_at")
        .eq("user_id", user.id)
        .is("stopped_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      activeTimer = fallbackResult.data;
      fetchError = fallbackResult.error;

      if (activeTimer) {
        console.info("[timers/stop] Recovered from a stale timer id", {
          userIdSuffix: user.id.slice(-8),
          requestedTimerIdSuffix: requestedTimerId.slice(-8),
          activeTimerIdSuffix: activeTimer.id.slice(-8),
        });
      }
    }

    if (fetchError) {
      console.error("Error fetching active timer:", fetchError);
      return NextResponse.json({ success: false, error: "Failed to fetch active timer" }, { status: 500 });
    }

    if (!activeTimer) {
      // Stopping is idempotent. Another client may have stopped the same
      // timer milliseconds earlier; returning success lets older desktop
      // clients clear their local running state instead of getting stuck.
      return NextResponse.json({
        success: true,
        message: "Timer was already stopped",
        data: { duration: 0, hours: 0 },
      });
    }
    
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

      return NextResponse.json({
        success: true,
        message: "Timer stopped (no time to save)",
        data: { duration: 0, hours: 0 },
      });
    }

    const trackedHours = Number((duration / 3600).toFixed(3));
    const startTime = startedAt.toTimeString().slice(0, 8); // HH:mm:ss
    const endTime = stoppedAt.toTimeString().slice(0, 8); // HH:mm:ss
    const date = stoppedAt.toISOString().split("T")[0]; // YYYY-MM-DD

    // Get task details for hourly rate calculation
    const { data: taskDetails, error: taskError } = await supabase
      .from("tasks")
      .select("title, project_id, estimated_hours, budget_cents, actual_hours, hourly_rate_cents")
      .eq("id", activeTimer.task_id)
      .eq("workspace_id", activeTimer.workspace_id)
      .single();

    if (taskError || !taskDetails) {
      console.error("Error fetching task details:", taskError);
      return NextResponse.json({ success: false, error: "Failed to fetch task details" }, { status: 500 });
    }

    const taskTitle = taskDetails.title || "Neznáma úloha";
    const projectId = taskDetails.project_id;
    let projectName = "";

    // Resolve hourly rate (similar logic to time entry endpoint)
    let hourlyRate = 0;
    let rateSource = "fallback";

    if (taskDetails.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("name, hourly_rate_cents")
        .eq("id", taskDetails.project_id)
        .maybeSingle();
      projectName = project?.name || "";

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
      } else if (project?.hourly_rate_cents != null) {
        // Priority 2: Check projects.hourly_rate_cents
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
          .order("is_default", { ascending: true })
          .order("valid_from", { ascending: false });

        if (rates && rates.length > 0) {
          const userRate = rates.find((r) => r.user_id === user.id);
          const rate = userRate || rates[0];
          hourlyRate = Number(rate.hourly_rate);
          rateSource = "rates_table";
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
          .order("is_default", { ascending: true })
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

    // Check if this is extra (non-billable) time and get description
    // Try to get is_extra and description separately if columns exist
    let isExtra = false;
    let timerDescription = "";
    try {
      const { data: timerWithExtra } = await supabase
        .from("task_timers")
        .select("is_extra, description")
        .eq("id", activeTimer.id)
        .single();
      isExtra = timerWithExtra?.is_extra || false;
      timerDescription = timerWithExtra?.description || "";
    } catch {
      // Columns don't exist yet, use defaults
      isExtra = false;
      timerDescription = "";
    }
    
    // For extra time, amount is always 0 and is_billable is false
    // For regular time, calculate amount based on budget
    let amount = 0;
    if (!isExtra) {
      const currentActualHours = taskDetails.actual_hours || 0;
      const hoursWithinBudget = Math.max(0, Math.min(currentActualHours, budgetHoursLimit));
      const remainingBudgetHours = Math.max(0, budgetHoursLimit - hoursWithinBudget);
      const newHoursWithinBudget = Math.min(trackedHours, remainingBudgetHours);
      const hoursOverBudget = Math.max(0, trackedHours - newHoursWithinBudget);
      amount = hoursOverBudget * hourlyRate;
    }

    // ATOMIC: First stop the timer (only if not already stopped)
    // This prevents race conditions and duplicate time entries
    const stoppedAtTime = new Date().toISOString();
    const { data: stoppedTimer, error: atomicStopError } = await supabase
      .from("task_timers")
      .update({ stopped_at: stoppedAtTime })
      .eq("id", activeTimer.id)
      .eq("user_id", user.id)
      .is("stopped_at", null) // Only update if not already stopped
      .select("id")
      .maybeSingle();

    if (atomicStopError) {
      console.error("Error atomically stopping timer:", atomicStopError);
      return NextResponse.json({ success: false, error: "Failed to stop timer" }, { status: 500 });
    }

    // If no rows were updated, timer was already stopped - don't create duplicate
    if (!stoppedTimer) {
      console.log("Timer already stopped by another request, skipping time entry creation");
      return NextResponse.json({ 
        success: true, 
        message: "Timer was already stopped",
        data: {
          duration: duration,
          hours: trackedHours
        }
      });
    }

    // Timer was successfully stopped, now create time entry
    const timeEntryData: Record<string, unknown> = {
      task_id: activeTimer.task_id,
      user_id: user.id,
      hours: trackedHours,
      date: date,
      description: timerDescription,
      hourly_rate: hourlyRate,
      amount: isExtra ? 0 : amount, // Extra time has no amount
      is_billable: !isExtra, // Extra time is not billable
      billing_type: isExtra ? 'extra' : 'budget', // Set billing type
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

    // Timer was already stopped atomically above, no need to call stop_timer RPC

    // Log activity - timer stopped
    const userDisplayName = await getUserDisplayName(user.id, supabase);
    const durationHours = (duration / 3600).toFixed(2);

    await logActivity({
      workspaceId: activeTimer.workspace_id,
      userId: user.id,
      type: ActivityTypes.TIMER_STOPPED,
      action: `Zastavil timer a uložil ${durationHours}h`,
      details: taskTitle,
      projectId: projectId ?? undefined,
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
    }, supabase);

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
