import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    console.log("Timer start API called");
    const supabase = createClient();
    const user = await getServerUser();

    console.log("User from getServerUser:", user?.id);

    if (!user) {
      console.error("No user found in timer start API");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, taskName, projectId, projectName } = body;

    console.log("Timer start request:", { taskId, taskName, projectId, projectName, userId: user.id });

    if (!taskId) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }

    // Use the database function to start timer
    console.log("Calling start_timer RPC function");
    const { data: timerId, error } = await supabase.rpc("start_timer", {
      p_task_id: taskId,
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error starting timer:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        success: false, 
        error: "Failed to start timer", 
        details: error.message 
      }, { status: 500 });
    }

    console.log("Timer started successfully, ID:", timerId);

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
