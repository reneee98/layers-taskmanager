import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";
import { logActivity, ActivityTypes, getUserDisplayName, getTaskTitle } from "@/lib/activity-logger";

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
    const { taskId, taskName, projectId, projectName, isExtra = false } = body;

    console.log("Timer start request:", { taskId, taskName, projectId, projectName, userId: user.id });

    if (!taskId) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }

    // First, get workspace_id from task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("workspace_id")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.error("Error fetching task:", taskError);
      return NextResponse.json({ 
        success: false, 
        error: "Task not found", 
        details: taskError?.message 
      }, { status: 404 });
    }

    console.log("Task workspace_id:", task.workspace_id);

    // Stop any active timer for this user first
    const { error: stopError } = await supabase
      .from("task_timers")
      .update({ stopped_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("stopped_at", null);

    if (stopError) {
      console.error("Error stopping previous timer:", stopError);
    }

    // Start new timer
    console.log("Inserting new timer", { isExtra });
    
    // Try to insert with is_extra, but handle case where column doesn't exist yet
    const insertData: any = {
      task_id: taskId,
      user_id: user.id,
      workspace_id: task.workspace_id,
      started_at: new Date().toISOString(),
    };
    
    // Only add is_extra if we're trying to set it to true (column might not exist)
    // If false, we can skip it since default is false
    if (isExtra) {
      insertData.is_extra = true;
    }
    
    const { data: newTimer, error } = await supabase
      .from("task_timers")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error starting timer:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        success: false, 
        error: "Failed to start timer", 
        details: error.message 
      }, { status: 500 });
    }

    console.log("Timer started successfully, ID:", newTimer.id);
    const timerId = newTimer.id;

    // Log activity - timer started
    const userDisplayName = await getUserDisplayName(user.id);
    const taskTitle = await getTaskTitle(taskId);
    await logActivity({
      workspaceId: task.workspace_id,
      userId: user.id,
      type: ActivityTypes.TIMER_STARTED,
      action: `Spustil timer`,
      details: taskTitle,
      projectId: projectId,
      taskId: taskId,
      metadata: {
        timer_id: timerId,
        task_name: taskName,
        project_name: projectName,
        started_at: new Date().toISOString(),
        user_display_name: userDisplayName
      }
    });

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
