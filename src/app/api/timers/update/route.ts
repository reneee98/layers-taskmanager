import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { is_extra, description } = body;

    // Get active timer for current user
    const { data: activeTimer, error: fetchError } = await supabase
      .from("task_timers")
      .select("id")
      .eq("user_id", user.id)
      .is("stopped_at", null)
      .single();

    if (fetchError || !activeTimer) {
      return NextResponse.json({ success: false, error: "No active timer found" }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    
    if (typeof is_extra === "boolean") {
      updateData.is_extra = is_extra;
    }
    
    if (typeof description === "string") {
      updateData.description = description;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    // Update timer
    const { error: updateError } = await supabase
      .from("task_timers")
      .update(updateData)
      .eq("id", activeTimer.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating timer:", updateError);
      return NextResponse.json({ success: false, error: "Failed to update timer" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in update timer PATCH:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

