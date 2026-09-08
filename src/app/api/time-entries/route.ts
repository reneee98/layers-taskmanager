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
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const isIsoDate = (value: string | null): value is string =>
      Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

    // Get time entries for the workspace
    // Note: time_entries has no FK to profiles, so user profiles are fetched separately
    let timeEntriesQuery = supabase
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
            code,
            color
          )
        )
      `)
      .eq("workspace_id", workspaceId);

    if (isIsoDate(dateFrom)) {
      timeEntriesQuery = timeEntriesQuery.gte("date", dateFrom);
    }

    if (isIsoDate(dateTo)) {
      timeEntriesQuery = timeEntriesQuery.lte("date", dateTo);
    }

    const { data: timeEntries, error } = await timeEntriesQuery
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching time entries:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch time entries" },
        { status: 500 }
      );
    }

    const userIds = Array.from(
      new Set((timeEntries || []).map((entry) => entry.user_id).filter(Boolean))
    );

    let profilesById = new Map<string, { id: string; display_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles for time entries:", profilesError);
      } else {
        profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
      }
    }

    const entriesWithProfiles = (timeEntries || []).map((entry) => ({
      ...entry,
      profiles:
        profilesById.get(entry.user_id) || {
          id: entry.user_id,
          display_name: "Neznámy",
          email: "",
        },
    }));

    return NextResponse.json({ success: true, data: entriesWithProfiles });
  } catch (error) {
    console.error("Error in time-entries API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
