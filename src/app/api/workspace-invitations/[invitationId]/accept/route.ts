import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { getServerUser } from "@/lib/auth/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SYSTEM_INVITATION_ROLES = new Set(["owner", "admin", "member", "user"]);

export async function POST(
  _request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const serviceClient = createServiceClient();
    const dataClient = serviceClient ?? supabase;

    if (!serviceClient) {
      console.warn(
        "Service role client unavailable in POST /workspace-invitations/[invitationId]/accept - using session client"
      );
    }

    // Get the invitation
    if (!user.email) {
      return NextResponse.json(
        { success: false, error: "Chýba email používateľa. Nie je možné prijať pozvánku." },
        { status: 400 }
      );
    }

    const { data: invitation, error: invitationError } = await dataClient
      .from("workspace_invitations")
      .select("*")
      .eq("id", params.invitationId)
      .ilike("email", user.email)
      .eq("status", "pending")
      .maybeSingle();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found or expired" },
        { status: 404 }
      );
    }

    // Check if invitation is still valid
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Invitation has expired" },
        { status: 400 }
      );
    }

    const requestedProjectIds = Array.isArray(invitation.project_ids)
      ? invitation.project_ids.filter(
          (projectId: unknown): projectId is string => typeof projectId === "string"
        )
      : [];

    // Validate selected project IDs belong to invitation workspace
    let scopedProjectIds: string[] = [];
    if (requestedProjectIds.length > 0) {
      const { data: projectsInWorkspace, error: projectsError } = await supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", invitation.workspace_id)
        .in("id", requestedProjectIds);

      if (projectsError) {
        console.error("Error validating invitation project IDs:", projectsError);
        return NextResponse.json(
          { success: false, error: "Failed to validate invitation projects" },
          { status: 500 }
        );
      }

      scopedProjectIds = (projectsInWorkspace || []).map((project) => project.id);
      if (scopedProjectIds.length !== requestedProjectIds.length) {
        return NextResponse.json(
          { success: false, error: "Invitation contains invalid project scope" },
          { status: 400 }
        );
      }
    }

    const invitationRole =
      typeof invitation.role === "string" ? invitation.role.toLowerCase() : "member";
    const isSystemRole = SYSTEM_INVITATION_ROLES.has(invitationRole);
    const workspaceMemberRole =
      invitationRole === "owner" || invitationRole === "admin" || invitationRole === "member"
        ? invitationRole
        : "member";
    const customRoleId =
      !isSystemRole && typeof invitation.role === "string" && UUID_REGEX.test(invitation.role)
        ? invitation.role
        : null;

    const memberPayload: Record<string, unknown> = {
      workspace_id: invitation.workspace_id,
      user_id: user.id,
      role: workspaceMemberRole,
      invited_by: invitation.invited_by,
    };

    if (scopedProjectIds.length > 0) {
      memberPayload.project_access_scope = "restricted";
    }

    let membershipAlreadyExists = false;

    // Add user to workspace_members
    const { error: addError } = await dataClient.from("workspace_members").insert(memberPayload);

    if (addError) {
      if (addError.code === "23505") {
        membershipAlreadyExists = true;
      } else if (
        String(addError.message || "").includes("Unauthorized attempt to add user to workspace")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Databáza blokuje prijatie pozvánky. Spustite migráciu 0081 a skúste znova.",
          },
          { status: 500 }
        );
      } else {
        console.error("Error adding member:", addError);
        return NextResponse.json(
          { success: false, error: "Failed to join workspace" },
          { status: 500 }
        );
      }
    }

    if (customRoleId) {
      const { error: assignRoleError } = await dataClient.from("user_roles").upsert(
        {
          workspace_id: invitation.workspace_id,
          user_id: user.id,
          role_id: customRoleId,
        },
        { onConflict: "workspace_id,user_id" }
      );

      if (assignRoleError) {
        console.error("Error assigning custom role after invitation accept:", assignRoleError);
      }
    } else {
      const { error: clearRoleError } = await dataClient
        .from("user_roles")
        .delete()
        .eq("workspace_id", invitation.workspace_id)
        .eq("user_id", user.id);

      if (clearRoleError) {
        console.error("Error clearing stale custom role after invitation accept:", clearRoleError);
      }
    }

    if (scopedProjectIds.length > 0) {
      const projectMemberships = scopedProjectIds.map((projectId) => ({
        project_id: projectId,
        user_id: user.id,
        role: "member",
      }));

      const { error: insertMembershipsError } = await dataClient
        .from("project_members")
        .upsert(projectMemberships, { onConflict: "project_id,user_id" });

      if (insertMembershipsError) {
        console.error(
          "Error creating project memberships after invitation accept:",
          insertMembershipsError
        );
      }
    }

    // Update invitation status to accepted
    const { error: updateError } = await dataClient
      .from("workspace_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", params.invitationId);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: membershipAlreadyExists
        ? "Pozvánka bola potvrdená. Už ste členom workspace."
        : "Successfully joined workspace",
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
