import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { timeEntrySchema } from "@/lib/validations/time-entry";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { logActivity, ActivityTypes, getUserDisplayName, getTaskTitle } from "@/lib/activity-logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(req);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const { taskId } = await params;
    const supabase = createClient();
    const body = await req.json();

    // Validate input
    const validatedData = timeEntrySchema.parse({
      ...body,
      task_id: taskId,
    });

    // Get task to find project_id, estimated_hours, budget_cents, actual_hours, and hourly_rate_cents (filtered by workspace)
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("project_id, estimated_hours, budget_cents, actual_hours, hourly_rate_cents")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Úloha nebola nájdená" },
        { status: 404 }
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    // Use auth user ID directly (no need for users table lookup)
    const userId = validatedData.user_id || user.id;

    // Resolve hourly rate if not provided
    let hourlyRate = validatedData.hourly_rate;
    let rateSource = "manual";

    if (hourlyRate == null) {
      // Use server-side Supabase client to resolve hourly rate
      // Only check project-related rates if task has a project
      if (task.project_id) {
        // Priority 1: Check project_members.hourly_rate
        const { data: projectMember } = await supabase
          .from("project_members")
          .select("hourly_rate")
          .eq("project_id", task.project_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (projectMember?.hourly_rate != null) {
          hourlyRate = Number(projectMember.hourly_rate);
          rateSource = "project_member";
        } else {
          // Priority 2: Check projects.hourly_rate_cents
          const { data: project } = await supabase
            .from("projects")
            .select("hourly_rate_cents")
            .eq("id", task.project_id)
            .maybeSingle();

          if (project?.hourly_rate_cents != null) {
            hourlyRate = Number(project.hourly_rate_cents) / 100;
            rateSource = "project_member";
          } else {
            // Priority 3: Check rates table
            const today = new Date().toISOString().split("T")[0];
            const { data: rates } = await supabase
              .from("rates")
              .select("id, name, hourly_rate, user_id, project_id, valid_from, valid_to, is_default")
              .or(`user_id.eq.${userId},project_id.eq.${task.project_id}`)
              .lte("valid_from", today)
              .or(`valid_to.is.null,valid_to.gte.${today}`)
              .order("is_default", { ascending: false })
              .order("valid_from", { ascending: false });

            if (rates && rates.length > 0) {
              const userRate = rates.find((r) => r.user_id === userId);
              const rate = userRate || rates[0];
              hourlyRate = Number(rate.hourly_rate);
              rateSource = "rates_table";
            } else {
              // Priority 4: Fallback to 0
              hourlyRate = 0;
              rateSource = "fallback";
            }
          }
        }
      } else {
        // Task has no project - Priority 1: Check task.hourly_rate_cents
        if (task.hourly_rate_cents != null && task.hourly_rate_cents > 0) {
          hourlyRate = Number(task.hourly_rate_cents) / 100;
          rateSource = "task";
        } else {
          // Priority 2: Check rates table for user rates only
          const today = new Date().toISOString().split("T")[0];
          const { data: rates } = await supabase
            .from("rates")
            .select("id, name, hourly_rate, user_id, project_id, valid_from, valid_to, is_default")
            .eq("user_id", userId)
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
              .eq("user_id", userId)
              .single();

            if (userSettings?.default_hourly_rate != null) {
              hourlyRate = Number(userSettings.default_hourly_rate);
              rateSource = "user_settings";
            } else {
              // Fallback to 0
              hourlyRate = 0;
              rateSource = "fallback";
            }
          }
        }
      }
    }

    // Determine the budget hours limit
    // Priority: budget_cents (if set) > estimated_hours
    let budgetHoursLimit = 0;
    let budgetAmount = 0; // Budget amount in euros
    
    if (task.budget_cents && task.budget_cents > 0 && hourlyRate && hourlyRate > 0) {
      // Calculate hours from budget: budget_cents / hourly_rate
      budgetAmount = task.budget_cents / 100; // Convert to euros
      budgetHoursLimit = budgetAmount / hourlyRate;
      console.log(`Using budget-based limit: ${budgetHoursLimit}h (budget: ${budgetAmount}€, rate: ${hourlyRate}€/h)`);
    } else if (task.estimated_hours && task.estimated_hours > 0) {
      // Fallback to estimated_hours if budget_cents is not set
      budgetHoursLimit = task.estimated_hours;
      console.log(`Using estimated_hours limit: ${budgetHoursLimit}h`);
    }

    // Calculate amount - budget covers hours up to limit, extra hours are billed
    const currentActualHours = task.actual_hours || 0;
    const totalHoursAfterEntry = currentActualHours + validatedData.hours;
    
    // Calculate how many hours from the new entry are within the budget limit
    const hoursWithinBudget = Math.max(0, Math.min(currentActualHours, budgetHoursLimit));
    const remainingBudgetHours = Math.max(0, budgetHoursLimit - hoursWithinBudget);
    const newHoursWithinBudget = Math.min(validatedData.hours, remainingBudgetHours);
    
    // Hours that exceed the budget limit (these will be billed)
    const hoursOverBudget = Math.max(0, validatedData.hours - newHoursWithinBudget);
    
    // Amount calculation:
    // - Hours within budget: amount = 0€ (covered by budget)
    // - Hours over budget: amount = hours_over_budget * hourly_rate
    const amount = hoursOverBudget * (hourlyRate || 0);
    
    console.log(`Time entry calculation: total=${validatedData.hours}h, hourly_rate=${hourlyRate}€/h (source: ${rateSource}), within_budget=${newHoursWithinBudget}h, over_budget=${hoursOverBudget}h, amount=${amount}€`);


    // Insert time entry
    // Only include project_id if task has a project
    const timeEntryData: any = {
      task_id: taskId,
      user_id: userId,
      hours: validatedData.hours,
      date: validatedData.date,
      description: validatedData.description || null,
      hourly_rate: hourlyRate,
      amount: amount,
      is_billable: validatedData.is_billable ?? true,
      start_time: validatedData.start_time || null,
      end_time: validatedData.end_time || null,
      workspace_id: workspaceId,
    };

    // Only add project_id if task has a project
    if (task.project_id) {
      timeEntryData.project_id = task.project_id;
    }

    const { data: timeEntry, error: insertError } = await supabase
      .from("time_entries")
      .insert(timeEntryData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // Update task actual_hours
    const { error: updateTaskError } = await supabase.rpc(
      "update_task_actual_hours",
      { task_id: taskId }
    );

    if (updateTaskError) {
      console.warn("Failed to update task actual_hours:", updateTaskError);
    }

    // Get updated project finance snapshot (only if task has a project)
    let financeSnapshot = null;
    if (task.project_id) {
      const { data: snapshot, error: financeError } = await supabase
        .from("project_finance_view")
        .select("*")
        .eq("project_id", task.project_id)
        .single();

      if (financeError) {
        console.warn("Failed to get finance snapshot:", financeError);
      } else {
        financeSnapshot = snapshot;
      }
    }

    // Log activity - time added
    const userDisplayName = await getUserDisplayName(userId);
    const taskTitle = await getTaskTitle(taskId);
    await logActivity({
      workspaceId,
      userId: userId,
      type: ActivityTypes.TIME_ADDED,
      action: `Pridal ${validatedData.hours}h času`,
      details: taskTitle,
      projectId: task.project_id,
      taskId: taskId,
      metadata: {
        hours: validatedData.hours,
        date: validatedData.date,
        description: validatedData.description,
        hourly_rate: hourlyRate,
        amount: amount,
        is_billable: validatedData.is_billable,
        user_display_name: userDisplayName
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        timeEntry,
        rateSource,
        financeSnapshot,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Neznáma chyba" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();

    const { data: entries, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("task_id", taskId)
      .order("date", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Fetch user data separately for each entry
    const data = await Promise.all(
      (entries || []).map(async (entry) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, display_name, email, avatar_url")
          .eq("id", entry.user_id)
          .single();

        return {
          ...entry,
          user: profile ? {
            id: profile.id,
            name: profile.display_name, // Map display_name to name
            email: profile.email,
            avatar_url: profile.avatar_url
          } : null,
        };
      })
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Neznáma chyba" },
      { status: 500 }
    );
  }
}

