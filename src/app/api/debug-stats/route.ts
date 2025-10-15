import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's workspace
    const { data: workspaceMember } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .single();

    if (!workspaceMember) {
      return NextResponse.json({ success: false, error: "No workspace found" }, { status: 404 });
    }

    const workspaceId = workspaceMember.workspace_id;

    // Get all projects
    const { data: allProjects, error: allProjectsError } = await supabase
      .from("projects")
      .select("id, name, status, workspace_id")
      .eq("workspace_id", workspaceId);

    // Get active projects
    const { data: activeProjects, error: activeProjectsError } = await supabase
      .from("projects")
      .select("id, name, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    // Get all time entries
    const { data: allTimeEntries, error: allTimeEntriesError } = await supabase
      .from("time_entries")
      .select("id, hours, date, workspace_id")
      .eq("workspace_id", workspaceId);

    // Get today's time entries
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const { data: todayTimeEntries, error: todayTimeEntriesError } = await supabase
      .from("time_entries")
      .select("id, hours, date")
      .eq("workspace_id", workspaceId)
      .gte("date", startOfDay.toISOString().split('T')[0])
      .lt("date", endOfDay.toISOString().split('T')[0]);

    return NextResponse.json({
      success: true,
      debug: {
        user: { id: user.id, email: user.email },
        workspaceId,
        allProjects: { data: allProjects, error: allProjectsError, count: allProjects?.length || 0 },
        activeProjects: { data: activeProjects, error: activeProjectsError, count: activeProjects?.length || 0 },
        allTimeEntries: { data: allTimeEntries, error: allTimeEntriesError, count: allTimeEntries?.length || 0 },
        todayTimeEntries: { data: todayTimeEntries, error: todayTimeEntriesError, count: todayTimeEntries?.length || 0 },
        dateRange: {
          startOfDay: startOfDay.toISOString().split('T')[0],
          endOfDay: endOfDay.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error("Error in debug stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch debug stats" },
      { status: 500 }
    );
  }
}
