import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();
    
    // Get workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Get activities for this task
    const { data: activities, error } = await supabase
      .from("activities")
      .select(`
        id,
        type,
        action,
        details,
        metadata,
        created_at,
        user_id
      `)
      .eq("workspace_id", workspaceId)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching activities:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Get user profiles for activities
    const userIds = Array.from(new Set(activities?.map(a => a.user_id) || []));
    const { data: userProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);

    // Add user info to activities
    const activitiesWithUsers = (activities || []).map(activity => {
      const userProfile = userProfiles?.find(p => p.id === activity.user_id);
      return {
        ...activity,
        user: userProfile ? {
          display_name: userProfile.display_name,
          name: userProfile.display_name,
          email: userProfile.email,
        } : null,
      };
    });

    return NextResponse.json({ success: true, data: activitiesWithUsers });
  } catch (error) {
    console.error("Error in activities GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

