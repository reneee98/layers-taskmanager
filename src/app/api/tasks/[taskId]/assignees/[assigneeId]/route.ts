import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string; assigneeId: string } }
) {
  try {
    const supabase = createClient();
    const { taskId, assigneeId } = params;

    const { error } = await supabase
      .from("task_assignees")
      .delete()
      .eq("id", assigneeId)
      .eq("task_id", taskId);

    if (error) {
      console.error("Failed to remove assignee:", error);
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa odstrániť priradenie" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing assignee:", error);
    return NextResponse.json(
      { success: false, error: "Vnútorná chyba servera" },
      { status: 500 }
    );
  }
}
