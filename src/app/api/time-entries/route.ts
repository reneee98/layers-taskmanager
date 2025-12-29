import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export async function GET(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const supabase = createClient();

    // Get time entries for the workspace
    const { data: timeEntries, error } = await supabase
      .from("time_entries")
      .select(`
        *,
        tasks (
          id,
          title,
          project_id,
          projects (
            id,
            name,
            code
          )
        ),
        profiles (
          id,
          display_name,
          email
        )
      `)
      .eq("workspace_id", workspaceId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching time entries:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch time entries" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: timeEntries });
  } catch (error) {
    console.error("Error in time-entries API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
