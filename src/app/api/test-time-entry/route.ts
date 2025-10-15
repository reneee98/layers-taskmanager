import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "No workspace found" }, { status: 404 });
    }

    const supabase = createClient();

    // Get first project and task for testing
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .single();

    if (!project) {
      return NextResponse.json({ success: false, error: "No projects found" }, { status: 404 });
    }

    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .single();

    if (!task) {
      return NextResponse.json({ success: false, error: "No tasks found" }, { status: 404 });
    }

    // Get today's date
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    // Create a test time entry for today
    const { data: timeEntry, error } = await supabase
      .from("time_entries")
      .insert({
        project_id: project.id,
        task_id: task.id,
        user_id: user.id,
        workspace_id: workspaceId,
        date: todayString,
        hours: 2.5,
        description: "Test time entry for today",
        is_billable: true,
        hourly_rate: 100.00
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating time entry:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        timeEntry,
        message: "Test time entry created for today"
      }
    });

  } catch (error) {
    console.error("Error creating test time entry:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create test time entry" },
      { status: 500 }
    );
  }
}
