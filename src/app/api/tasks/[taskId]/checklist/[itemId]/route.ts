import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateChecklistItemSchema = z.object({
  text: z.string().min(1, "Text je povinný").optional(),
  completed: z.boolean().optional(),
  position: z.number().optional(),
});

// PUT - Update a checklist item
export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string; itemId: string } }
) {
  try {
    const { taskId, itemId } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // RLS policies will handle access control

    const body = await request.json();
    const validatedData = updateChecklistItemSchema.parse(body);

    const { data, error } = await supabase
      .from("task_checklist_items")
      .update(validatedData)
      .eq("id", itemId)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error updating checklist item:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/tasks/[taskId]/checklist/[itemId]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a checklist item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string; itemId: string } }
) {
  try {
    const { taskId, itemId } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // RLS policies will handle access control

    const { error } = await supabase
      .from("task_checklist_items")
      .delete()
      .eq("id", itemId)
      .eq("task_id", taskId);

    if (error) {
      console.error("Error deleting checklist item:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/tasks/[taskId]/checklist/[itemId]:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
