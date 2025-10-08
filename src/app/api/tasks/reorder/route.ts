import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reorderTasksSchema } from "@/lib/validations/task";
import { validateSchema } from "@/lib/zod-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateSchema(reorderTasksSchema, body);

    if (!validation.success) {
      return NextResponse.json(validation, { status: 400 });
    }

    const supabase = createClient();

    // Batch update all tasks with their new order_index
    const updates = validation.data.tasks.map((task) =>
      supabase
        .from("tasks")
        .update({ order_index: task.order_index })
        .eq("id", task.id)
    );

    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to update ${errors.length} task(s)`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { updated: validation.data.tasks.length },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

