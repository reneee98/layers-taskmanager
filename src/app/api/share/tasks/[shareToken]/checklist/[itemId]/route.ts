import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

const updateChecklistItemSchema = z.object({
  completed: z.boolean(),
});

// PUT - Update checklist item completion status via share token
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string; itemId: string }> }
) {
  try {
    const { shareToken, itemId } = await params;
    // Use service role client to bypass RLS for public access
    const supabase = createServiceClient();
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: "Server configuration error"
      }, { status: 500 });
    }

    // Find task by share token
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("share_token", shareToken)
      .single();

    if (taskError || !task) {
      return NextResponse.json({
        success: false,
        error: "Úloha nebola nájdená alebo nie je zdieľateľná"
      }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateChecklistItemSchema.parse(body);

    // Update checklist item
    const { data, error } = await supabase
      .from("task_checklist_items")
      .update({ completed: validatedData.completed })
      .eq("id", itemId)
      .eq("task_id", task.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating checklist item:", error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/share/tasks/[shareToken]/checklist/[itemId]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: error.errors
      }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}

