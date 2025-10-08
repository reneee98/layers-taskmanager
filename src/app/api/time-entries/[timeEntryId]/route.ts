import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { timeEntryUpdateSchema } from "@/lib/validations/time-entry";
import { resolveHourlyRate } from "@/server/rates/resolveHourlyRate";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ timeEntryId: string }> }
) {
  try {
    const { timeEntryId: id } = await params;
    const supabase = createClient();

    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ timeEntryId: string }> }
) {
  try {
    const { timeEntryId: id } = await params;
    const supabase = createClient();
    const body = await req.json();

    // Validate input
    const validatedData = timeEntryUpdateSchema.parse(body);

    // Get existing time entry
    const { data: existing, error: fetchError } = await supabase
      .from("time_entries")
      .select("*, tasks(project_id)")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Time entry nebola nájdená" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (validatedData.hours !== undefined) {
      updateData.hours = validatedData.hours;
    }
    if (validatedData.date !== undefined) {
      updateData.date = validatedData.date;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description || null;
    }
    if (validatedData.is_billable !== undefined) {
      updateData.is_billable = validatedData.is_billable;
    }

    // Handle hourly_rate update
    let recalculateAmount = false;

    if (validatedData.hourly_rate !== undefined) {
      // Explicitly set rate
      updateData.hourly_rate = validatedData.hourly_rate;
      recalculateAmount = true;
    } else if (validatedData.hours !== undefined) {
      // Hours changed, recalculate with existing rate
      recalculateAmount = true;
    }

    // Recalculate amount if needed
    if (recalculateAmount) {
      const hours = updateData.hours ?? existing.hours;
      const rate = updateData.hourly_rate ?? existing.hourly_rate ?? 0;
      updateData.amount = hours * rate;
    }

    // Update time entry
    const { data: updated, error: updateError } = await supabase
      .from("time_entries")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Update task actual_hours
    const { error: updateTaskError } = await supabase.rpc(
      "update_task_actual_hours",
      { task_id: existing.task_id }
    );

    if (updateTaskError) {
      console.warn("Failed to update task actual_hours:", updateTaskError);
    }

    // Get updated project finance snapshot
    const projectId = (existing as any).tasks?.project_id;
    let financeSnapshot = null;

    if (projectId) {
      const { data, error: financeError } = await supabase
        .from("project_finance_view")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (!financeError) {
        financeSnapshot = data;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        timeEntry: updated,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ timeEntryId: string }> }
) {
  try {
    const { timeEntryId: id } = await params;
    const supabase = createClient();

    // Get time entry before deletion (need task_id and project_id)
    const { data: existing, error: fetchError } = await supabase
      .from("time_entries")
      .select("task_id, tasks(project_id)")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Time entry nebola nájdená" },
        { status: 404 }
      );
    }

    const taskId = existing.task_id;
    const projectId = (existing as any).tasks?.project_id;

    // Delete time entry
    const { error: deleteError } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: deleteError.message },
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
    let financeSnapshot = null;

    if (projectId) {
      const { data, error: financeError } = await supabase
        .from("project_finance_view")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (!financeError) {
        financeSnapshot = data;
      }
    }

    return NextResponse.json({
      success: true,
      data: { financeSnapshot },
    });
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

