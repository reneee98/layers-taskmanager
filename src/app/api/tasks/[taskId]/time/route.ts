import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { timeEntrySchema } from "@/lib/validations/time-entry";
import { resolveHourlyRate } from "@/server/rates/resolveHourlyRate";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

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

    // Get task to find project_id (filtered by workspace)
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("project_id")
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
        start_time: validatedData.start_time || null,
        end_time: validatedData.end_time || null,
        workspace_id: workspaceId,
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

