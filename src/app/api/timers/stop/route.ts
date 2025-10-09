import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get active timer for current user
    const { data: activeTimer, error: fetchError } = await supabase
      .from("task_timers")
      .select("id")
      .eq("user_id", user.id)
      .is("stopped_at", null)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        // No active timer found
        return NextResponse.json({ success: false, error: "No active timer found" }, { status: 404 });
      }
      console.error("Error fetching active timer:", fetchError);
      return NextResponse.json({ success: false, error: "Failed to fetch active timer" }, { status: 500 });
    }

    // Use the database function to stop timer
    const { data: success, error } = await supabase.rpc("stop_timer", {
      p_timer_id: activeTimer.id,
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error stopping timer:", error);
      return NextResponse.json({ success: false, error: "Failed to stop timer" }, { status: 500 });
    }

    if (!success) {
      return NextResponse.json({ success: false, error: "Failed to stop timer" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in stop timer POST:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
