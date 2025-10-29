import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get workspace_id from request query params
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID je povinný" },
        { status: 400 }
      );
    }

    // Get recent activities from the activities table
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select(`
        id,
        type,
        action,
        details,
        metadata,
        created_at,
        project_id,
        task_id,
        user_id
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (activitiesError) {
      console.error("Error fetching activities:", activitiesError);
      return NextResponse.json(
        { success: false, error: "Chyba pri načítavaní aktivít" },
        { status: 500 }
      );
    }

    // Get project names for activities
    const projectIds = Array.from(new Set(activities?.map(a => a.project_id).filter(Boolean) || []));
    let projects: any[] = [];
    
    if (projectIds.length > 0) {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name, code")
        .in("id", projectIds);
      
      projects = projectsData || [];
    }

    // Get task titles for activities
    const taskIds = Array.from(new Set(activities?.map(a => a.task_id).filter(Boolean) || []));
    let tasks: any[] = [];
    
    if (taskIds.length > 0) {
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title")
        .in("id", taskIds);
      
      tasks = tasksData || [];
    }

    // Get user profiles for activities
    const userIds = Array.from(new Set(activities?.map(a => a.user_id).filter(Boolean) || []));
    let users: any[] = [];
    
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);
      
      users = usersData || [];
    }

    // Format activities for frontend
    const formattedActivities = activities?.map(activity => {
      const project = projects.find(p => p.id === activity.project_id);
      const task = tasks.find(t => t.id === activity.task_id);
      const user = users.find(u => u.id === activity.user_id);

      return {
        id: activity.id,
        type: activity.type,
        action: activity.action,
        details: activity.details,
        project: project?.name,
        project_id: activity.project_id,
        project_code: project?.code,
        task_title: task?.title,
        task_id: activity.task_id,
        user: user?.display_name || "Neznámy používateľ",
        user_email: user?.email,
        user_name: user?.display_name,
        created_at: activity.created_at,
        metadata: activity.metadata
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: formattedActivities
    });

  } catch (error) {
    console.error("Error in activity API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}