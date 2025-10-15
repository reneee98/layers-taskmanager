import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export async function GET(request: NextRequest) {
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

    // Get active projects count
    const { count: activeProjectsCount, error: projectsError } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    console.log("Active projects query result:", { activeProjectsCount, projectsError });

    // Get completed projects count (for invoices)
    const { count: completedProjectsCount, error: completedProjectsError } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "completed");

    console.log("Completed projects query result:", { completedProjectsCount, completedProjectsError });

    // Get today's tracked time for the current user only
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log("Today's date:", todayString);
    console.log("User ID:", user.id);

    const { data: todayTimeEntries, error: timeEntriesError } = await supabase
      .from("time_entries")
      .select("hours, date, user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id) // Only current user's time entries
      .eq("date", todayString); // Only today's entries

    console.log("Today time entries query result:", { todayTimeEntries, timeEntriesError });

    const todayTrackedHours = todayTimeEntries?.reduce((total, entry) => total + (entry.hours || 0), 0) || 0;
    const todayTrackedMinutes = Math.round(todayTrackedHours * 60);

    console.log("Calculated stats:", {
      activeProjects: activeProjectsCount || 0,
      completedProjects: completedProjectsCount || 0,
      todayTrackedHours,
      todayTrackedMinutes
    });

    return NextResponse.json({
      success: true,
      data: {
        activeProjects: activeProjectsCount || 0,
        completedProjects: completedProjectsCount || 0,
        todayTrackedHours: todayTrackedHours,
        todayTrackedMinutes: todayTrackedMinutes
      }
    });

  } catch (error) {
    console.error("Error fetching workspace stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch workspace stats" },
      { status: 500 }
    );
  }
}
