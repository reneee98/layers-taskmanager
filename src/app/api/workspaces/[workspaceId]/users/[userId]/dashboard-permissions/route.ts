import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Get dashboard permissions for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    const { workspaceId, userId } = await params;
    const supabase = createClient();

    // Check if current user is workspace owner
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Only owners can view dashboard permissions
    if (workspace.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Nemáte oprávnenie" },
        { status: 403 }
      );
    }

    // Get dashboard permissions
    const { data: permissions, error: permissionsError } = await supabase
      .from("dashboard_permissions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    if (permissionsError && permissionsError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is OK (will use defaults)
      return NextResponse.json(
        { success: false, error: permissionsError.message },
        { status: 500 }
      );
    }

    // If no permissions exist, return defaults
    if (!permissions) {
      return NextResponse.json({
        success: true,
        data: {
          show_stats_overview: true,
          show_tasks_section: true,
          show_activities_section: true,
          show_calendar_section: true,
          show_projects_section: true,
          show_clients_section: true,
          show_tab_all_active: true,
          show_tab_today: true,
          show_tab_sent_to_client: true,
          show_tab_in_progress: true,
          show_tab_unassigned: true,
          show_tab_overdue: true,
          show_tab_upcoming: true,
          show_stat_total_tasks: true,
          show_stat_completed_tasks: true,
          show_stat_in_progress_tasks: true,
          show_stat_total_hours: true,
          show_stat_completion_rate: true,
        },
      });
    }

    return NextResponse.json({ success: true, data: permissions });
  } catch (error) {
    console.error("Error fetching dashboard permissions:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST/PUT - Update dashboard permissions for a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    const { workspaceId, userId } = await params;
    const body = await request.json();
    const supabase = createClient();

    // Check if current user is workspace owner
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Only owners can update dashboard permissions
    if (workspace.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Nemáte oprávnenie" },
        { status: 403 }
      );
    }

    // Verify that target user is a member of the workspace
    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    // Also check if user is the owner
    const isOwner = workspace.owner_id === userId;

    if (memberError && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Používateľ nie je členom workspace" },
        { status: 404 }
      );
    }

    // Prepare permissions data
    const permissionsData = {
      workspace_id: workspaceId,
      user_id: userId,
      show_stats_overview: body.show_stats_overview ?? true,
      show_tasks_section: body.show_tasks_section ?? true,
      show_activities_section: body.show_activities_section ?? true,
      show_calendar_section: body.show_calendar_section ?? true,
      show_projects_section: body.show_projects_section ?? true,
      show_clients_section: body.show_clients_section ?? true,
      show_tab_all_active: body.show_tab_all_active ?? true,
      show_tab_today: body.show_tab_today ?? true,
      show_tab_sent_to_client: body.show_tab_sent_to_client ?? true,
      show_tab_in_progress: body.show_tab_in_progress ?? true,
      show_tab_unassigned: body.show_tab_unassigned ?? true,
      show_tab_overdue: body.show_tab_overdue ?? true,
      show_tab_upcoming: body.show_tab_upcoming ?? true,
      show_stat_total_tasks: body.show_stat_total_tasks ?? true,
      show_stat_completed_tasks: body.show_stat_completed_tasks ?? true,
      show_stat_in_progress_tasks: body.show_stat_in_progress_tasks ?? true,
      show_stat_total_hours: body.show_stat_total_hours ?? true,
      show_stat_completion_rate: body.show_stat_completion_rate ?? true,
      custom_settings: body.custom_settings || {},
    };

    // Upsert permissions (insert or update)
    const { data: permissions, error: upsertError } = await supabase
      .from("dashboard_permissions")
      .upsert(permissionsData, {
        onConflict: "workspace_id,user_id",
      })
      .select()
      .single();

    if (upsertError) {
      console.error("Error upserting dashboard permissions:", upsertError);
      return NextResponse.json(
        { success: false, error: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: permissions,
      message: "Dashboard permissions updated successfully",
    });
  } catch (error) {
    console.error("Error updating dashboard permissions:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Alias for POST
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  return POST(request, { params });
}

