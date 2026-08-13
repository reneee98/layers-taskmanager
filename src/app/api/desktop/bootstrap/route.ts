import { NextRequest, NextResponse } from "next/server";

import { getProjectAccessContext } from "@/lib/auth/project-access";
import { getUserAccessibleWorkspaces } from "@/lib/auth/workspace-security";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedRequestContext } from "@/lib/supabase/request";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ACTIVE_TASK_STATUSES = ["todo", "in_progress", "review", "sent_to_client"];

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext(request);

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await getUserAccessibleWorkspaces(user.id);

    if (workspaces.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nemáte prístup k žiadnemu workspace" },
        { status: 404 }
      );
    }

    const requestedWorkspaceId = request.nextUrl.searchParams.get("workspace_id");
    const selectedWorkspace = requestedWorkspaceId
      ? workspaces.find((workspace) => workspace.id === requestedWorkspaceId)
      : workspaces[0];

    if (!selectedWorkspace) {
      return NextResponse.json(
        { success: false, error: "K tomuto workspace nemáte prístup" },
        { status: 403 }
      );
    }

    const serviceClient = createServiceClient();
    const dataClient = (serviceClient || supabase) as ReturnType<typeof createServerClient>;
    const projectAccess = await getProjectAccessContext(
      selectedWorkspace.id,
      user.id,
      dataClient
    );

    let tasksQuery = dataClient
      .from("tasks")
      .select(
        `
          id,
          title,
          status,
          priority,
          due_date,
          updated_at,
          actual_hours,
          project_id,
          project:projects(id, name, code, color)
        `
      )
      .eq("workspace_id", selectedWorkspace.id)
      .in("status", ACTIVE_TASK_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(300);

    if (!projectAccess.hasFullProjectAccess) {
      if (projectAccess.accessibleProjectIds.length === 0) {
        return NextResponse.json(
          {
            success: true,
            data: {
              user: { id: user.id, email: user.email },
              workspaces: workspaces.map((workspace) => ({
                id: workspace.id,
                name: workspace.name,
                role: workspace.role,
              })),
              currentWorkspaceId: selectedWorkspace.id,
              tasks: [],
            },
          },
          { headers: { "Cache-Control": "private, no-store" } }
        );
      }

      tasksQuery = tasksQuery.in("project_id", projectAccess.accessibleProjectIds);
    }

    const { data: tasks, error } = await tasksQuery;

    if (error) {
      console.error("Desktop bootstrap task query failed:", error);
      return NextResponse.json(
        { success: false, error: "Úlohy sa nepodarilo načítať" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: { id: user.id, email: user.email },
          workspaces: workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            role: workspace.role,
          })),
          currentWorkspaceId: selectedWorkspace.id,
          tasks: tasks || [],
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Desktop bootstrap failed:", error);
    return NextResponse.json(
      { success: false, error: "Tracker sa nepodarilo načítať" },
      { status: 500 }
    );
  }
}
