import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { resolveHourlyRate } from "@/server/rates/resolveHourlyRate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();
    
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(req);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Get task with budget info
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, project_id, estimated_hours, budget_cents, actual_hours")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Úloha nebola nájdená" },
        { status: 404 }
      );
    }

    // Get all time entries for this task
    const { data: timeEntries, error: entriesError } = await supabase
      .from("time_entries")
      .select("id, hours, hourly_rate, user_id")
      .eq("task_id", taskId)
      .order("date", { ascending: true }); // Process in chronological order

    if (entriesError) {
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa načítať time entries" },
        { status: 500 }
      );
    }

    if (!timeEntries || timeEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Žiadne time entries na prepočítanie",
        recalculated: 0
      });
    }

    // Determine budget hours limit
    let budgetHoursLimit = 0;
    let hourlyRate = 0;
    
    // Get hourly rate from first entry or resolve it
    if (timeEntries[0]?.hourly_rate) {
      hourlyRate = timeEntries[0].hourly_rate;
    } else if (timeEntries[0]?.user_id && task.project_id) {
      const resolved = await resolveHourlyRate(timeEntries[0].user_id, task.project_id);
      hourlyRate = resolved.hourlyRate;
    }

    if (task.budget_cents && task.budget_cents > 0 && hourlyRate && hourlyRate > 0) {
      const budgetInEuros = task.budget_cents / 100;
      budgetHoursLimit = budgetInEuros / hourlyRate;
    } else if (task.estimated_hours && task.estimated_hours > 0) {
      budgetHoursLimit = task.estimated_hours;
    }

    // Recalculate amounts for all entries in chronological order
    let cumulativeHours = 0;
    let recalculated = 0;

    for (const entry of timeEntries) {
      const entryRate = entry.hourly_rate || hourlyRate;
      
      // Calculate how many hours from this entry are within budget
      const hoursWithinBudget = Math.max(0, Math.min(cumulativeHours, budgetHoursLimit));
      const remainingBudgetHours = Math.max(0, budgetHoursLimit - hoursWithinBudget);
      const newHoursWithinBudget = Math.min(entry.hours, remainingBudgetHours);
      
      // Hours that exceed the budget limit
      const hoursOverBudget = Math.max(0, entry.hours - newHoursWithinBudget);
      
      // Calculate new amount
      const newAmount = hoursOverBudget * entryRate;
      
      // Update entry
      const { error: updateError } = await supabase
        .from("time_entries")
        .update({ amount: newAmount })
        .eq("id", entry.id);

      if (!updateError) {
        recalculated++;
        cumulativeHours += entry.hours;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Prepočítaných ${recalculated} time entries`,
      recalculated
    });
  } catch (error) {
    console.error("Error recalculating time entries:", error);
    return NextResponse.json(
      { success: false, error: "Nepodarilo sa prepočítať time entries" },
      { status: 500 }
    );
  }
}

