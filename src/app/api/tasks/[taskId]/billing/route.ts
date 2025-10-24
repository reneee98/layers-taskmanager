import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taskId = params.taskId;
    const body = await request.json();
    
    // Validate required fields
    const { billable, bill_status, hourly_rate_cents, actual_minutes } = body;
    
    if (typeof billable !== 'boolean') {
      return NextResponse.json({ error: "billable must be a boolean" }, { status: 400 });
    }
    
    if (bill_status && !['unbilled', 'billed', 'excluded'].includes(bill_status)) {
      return NextResponse.json({ error: "Invalid bill_status" }, { status: 400 });
    }
    
    if (hourly_rate_cents !== undefined && (typeof hourly_rate_cents !== 'number' || hourly_rate_cents < 0)) {
      return NextResponse.json({ error: "hourly_rate_cents must be a non-negative number" }, { status: 400 });
    }
    
    if (actual_minutes !== undefined && (typeof actual_minutes !== 'number' || actual_minutes < 0)) {
      return NextResponse.json({ error: "actual_minutes must be a non-negative number" }, { status: 400 });
    }

    // Check if task exists and user has access
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update billing fields
    const updateData: any = {};
    if (billable !== undefined) updateData.billable = billable;
    if (bill_status !== undefined) updateData.bill_status = bill_status;
    if (hourly_rate_cents !== undefined) updateData.hourly_rate_cents = hourly_rate_cents;
    if (actual_minutes !== undefined) updateData.actual_minutes = actual_minutes;

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task billing:', updateError);
      return NextResponse.json({ error: "Failed to update task billing" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedTask
    });

  } catch (error) {
    console.error('Error in task billing API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
