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

    // Get all workspaces
    const { data: workspaces, error: workspacesError } = await supabase
      .from("workspaces")
      .select("id, name, owner_id");

    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, status, workspace_id");

    // Get all time entries
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from("time_entries")
      .select("id, hours, date, workspace_id");

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, email");

    return NextResponse.json({
      success: true,
      data: {
        workspaces: { data: workspaces, error: workspacesError, count: workspaces?.length || 0 },
        projects: { data: projects, error: projectsError, count: projects?.length || 0 },
        timeEntries: { data: timeEntries, error: timeEntriesError, count: timeEntries?.length || 0 },
        profiles: { data: profiles, error: profilesError, count: profiles?.length || 0 }
      }
    });

  } catch (error) {
    console.error("Error in test stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch test stats" },
      { status: 500 }
    );
  }
}
