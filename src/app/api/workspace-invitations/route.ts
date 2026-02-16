import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    const query = () =>
      supabase
        .from("workspace_invitations")
        .select(
          `
          *,
          workspace:workspaces(id, name, description, owner_id)
        `
        )
        .eq("email", user.email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

    let { data: invitations, error } = await query();

    if (error && String(error.message || "").includes("project_ids")) {
      const fallback = await supabase
        .from("workspace_invitations")
        .select(
          `
          id,
          email,
          role,
          status,
          expires_at,
          created_at,
          invited_by,
          workspace_id,
          workspace:workspaces(id, name, description, owner_id)
        `
        )
        .eq("email", user.email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      invitations = fallback.data as any[];
      error = fallback.error as any;
    }

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    const rawInvitations = invitations || [];
    const customRoleIds = Array.from(
      new Set(
        rawInvitations
          .map((invitation: any) => invitation?.role)
          .filter(
            (roleValue: unknown): roleValue is string =>
              typeof roleValue === "string" && UUID_REGEX.test(roleValue)
          )
      )
    );
    const allProjectIds = Array.from(
      new Set(
        rawInvitations
          .flatMap((invitation: any) =>
            Array.isArray(invitation.project_ids) ? invitation.project_ids : []
          )
          .filter((projectId: unknown): projectId is string => typeof projectId === "string")
      )
    );

    const projectNamesById = new Map<string, string>();
    const customRoleNamesById = new Map<string, string>();

    if (customRoleIds.length > 0) {
      const { data: roles } = await supabase.from("roles").select("id, name").in("id", customRoleIds);

      (roles || []).forEach((role) => {
        customRoleNamesById.set(role.id, role.name);
      });
    }

    if (allProjectIds.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", allProjectIds);

      (projects || []).forEach((project) => {
        projectNamesById.set(project.id, project.name);
      });
    }

    const enrichedInvitations = rawInvitations.map((invitation: any) => {
      const invitationProjectIds = Array.isArray(invitation.project_ids)
        ? invitation.project_ids.filter(
            (projectId: unknown): projectId is string => typeof projectId === "string"
          )
        : [];
      const projectNames = invitationProjectIds
        .map((projectId: string) => projectNamesById.get(projectId))
        .filter((name: string | undefined): name is string => Boolean(name));

      return {
        ...invitation,
        role_id: UUID_REGEX.test(String(invitation.role || "")) ? invitation.role : null,
        role_display:
          customRoleNamesById.get(String(invitation.role || "")) || invitation.role,
        project_ids: invitationProjectIds,
        project_names: projectNames,
      };
    });

    return NextResponse.json({ success: true, data: enrichedInvitations });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
