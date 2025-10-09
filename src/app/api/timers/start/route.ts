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

    const body = await request.json();
    const { taskId, taskName, projectId, projectName } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }

    // Use the database function to start timer
    const { data: timerId, error } = await supabase.rpc("start_timer", {
      p_task_id: taskId,
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error starting timer:", error);
      return NextResponse.json({ success: false, error: "Failed to start timer" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        timerId,
        taskId,
        taskName,
        projectId,
        projectName 
      } 
    });
  } catch (error) {
    console.error("Error in start timer POST:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
