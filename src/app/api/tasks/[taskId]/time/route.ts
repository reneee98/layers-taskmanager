import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { timeEntrySchema } from "@/lib/validations/time-entry";
import { resolveHourlyRate } from "@/server/rates/resolveHourlyRate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();
    const body = await req.json();

    // Validate input
    const validatedData = timeEntrySchema.parse({
      ...body,
      task_id: taskId,
    });

    // Get task to find project_id
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("project_id")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Úloha nebola nájdená" },
        { status: 404 }
      );
    }

    // Use provided user_id or default to authenticated user
    const userId = validatedData.user_id || "00000000-0000-0000-0000-000000000000"; // TODO: Get from auth

    // Resolve hourly rate if not provided
    let hourlyRate = validatedData.hourly_rate;
    let rateSource = "manual";

    if (hourlyRate == null) {
      const resolved = await resolveHourlyRate(userId, task.project_id);
      hourlyRate = resolved.hourlyRate;
      rateSource = resolved.source;
    }

    // Calculate amount
    const amount = validatedData.hours * (hourlyRate || 0);

    // Insert time entry
    const { data: timeEntry, error: insertError } = await supabase
      .from("time_entries")
      .insert({
        project_id: task.project_id,
        task_id: taskId,
        user_id: userId,
        hours: validatedData.hours,
        date: validatedData.date,
        description: validatedData.description || null,
        hourly_rate: hourlyRate,
        amount: amount,
        is_billable: validatedData.is_billable ?? true,
      })
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

    // Get updated project finance snapshot
    const { data: financeSnapshot, error: financeError } = await supabase
      .from("project_finance_view")
      .select("*")
      .eq("project_id", task.project_id)
      .single();

    if (financeError) {
      console.warn("Failed to get finance snapshot:", financeError);
    }

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

    const { data, error } = await supabase
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

