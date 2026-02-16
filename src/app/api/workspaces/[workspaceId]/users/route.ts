import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { isWorkspaceOwner } from "@/lib/auth/workspace-security";

const SYSTEM_ROLES = new Set(["owner", "member"]);

type WorkspaceRow = {
  owner_id: string;
  created_at: string | null;
};

type WorkspaceMemberRow = {
  user_id: string;
  role: string;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type RoleRef = {
  id: string;
  name: string;
};

type UserRoleRow = {
  user_id: string;
  role_id: string;
  roles: RoleRef | RoleRef[] | null;
};

function getSupabaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const errorCode = (error as { code?: unknown }).code;
  return typeof errorCode === "string" ? errorCode : null;
}

function isInvitationRoleConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  const message = String((error as { message?: unknown }).message || "");
  return code === "23514" && message.includes("workspace_invitations_role_check");
}

function extractRoleName(roleRef: UserRoleRow["roles"]): string | null {
  if (!roleRef) {
    return null;
  }

  if (Array.isArray(roleRef)) {
    return roleRef[0]?.name ?? null;
  }

  return roleRef.name ?? null;
}

export async function GET(_request: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = params;

    const { data: workspaceData, error: workspaceError } = await supabase
      .from("workspaces")
      .select("owner_id, created_at")
      .eq("id", workspaceId)
      .single();

    const workspace = workspaceData as WorkspaceRow | null;

    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const { data: currentMembershipData, error: membershipError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    const currentMembership = currentMembershipData as { role: string } | null;

    if (membershipError && getSupabaseErrorCode(membershipError) !== "PGRST116") {
      console.error("Error checking current membership:", membershipError);
      return NextResponse.json(
        { success: false, error: "Failed to verify workspace access" },
        { status: 500 }
      );
    }

    const canManageUsers = workspace.owner_id === user.id || currentMembership?.role === "owner";
    const hasAccess = canManageUsers || Boolean(currentMembership);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied - not a member of this workspace" },
        { status: 403 }
      );
    }

    const serviceClient = createServiceClient();
    const dataClient = serviceClient ?? supabase;

    if (!serviceClient) {
      console.warn(
        "Service role client unavailable in GET /workspaces/[workspaceId]/users - using session client"
      );
    }

    const { data: membersData, error: membersError } = await dataClient
      .from("workspace_members")
      .select("user_id, role, created_at")
      .eq("workspace_id", workspaceId);

    if (membersError) {
      console.error("Error fetching workspace members:", membersError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch workspace members" },
        { status: 500 }
      );
    }

    const members = (membersData ?? []) as WorkspaceMemberRow[];
    const memberByUserId = new Map(members.map((member) => [member.user_id, member]));

    const userIds = new Set<string>(members.map((member) => member.user_id));
    userIds.add(workspace.owner_id);
    const userIdList = Array.from(userIds);

    let profiles: ProfileRow[] = [];
    if (userIdList.length > 0) {
      const { data: profilesData, error: profilesError } = await dataClient
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIdList);

      if (profilesError) {
        console.error("Error fetching profiles for workspace users:", profilesError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch workspace user profiles" },
          { status: 500 }
        );
      }

      profiles = (profilesData ?? []) as ProfileRow[];
    }

    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

    const { data: userRolesData, error: userRolesError } = await dataClient
      .from("user_roles")
      .select("user_id, role_id, roles(id, name)")
      .eq("workspace_id", workspaceId);

    if (userRolesError) {
      console.error("Error fetching custom user roles:", userRolesError);
    }

    const userRoles = (userRolesData ?? []) as UserRoleRow[];
    const customRoleNameByUserId = new Map<string, string>();
    const customRoleIdByUserId = new Map<string, string>();

    userRoles.forEach((userRole) => {
      const customRoleName = extractRoleName(userRole.roles);
      if (customRoleName) {
        customRoleNameByUserId.set(userRole.user_id, customRoleName);
      }
      customRoleIdByUserId.set(userRole.user_id, userRole.role_id);
    });

    const formattedUsers: Array<{
      user_id: string;
      role: string;
      role_id?: string;
      email: string;
      display_name: string;
      is_owner: boolean;
      joined_at: string;
    }> = [];

    const ownerProfile = profilesById.get(workspace.owner_id);
    const ownerMembership = memberByUserId.get(workspace.owner_id);
    const ownerCustomRoleName = customRoleNameByUserId.get(workspace.owner_id);
    const ownerCustomRoleId = customRoleIdByUserId.get(workspace.owner_id);

    formattedUsers.push({
      user_id: workspace.owner_id,
      role: ownerCustomRoleName || ownerMembership?.role || "owner",
      role_id: ownerCustomRoleId,
      display_name: ownerProfile?.display_name || ownerProfile?.email || "Unknown User",
      email: ownerProfile?.email || "",
      is_owner: true,
      joined_at: ownerMembership?.created_at || workspace.created_at || new Date().toISOString(),
    });

    members.forEach((member) => {
      if (member.user_id === workspace.owner_id) {
        return;
      }

      const profile = profilesById.get(member.user_id);
      const customRoleName = customRoleNameByUserId.get(member.user_id);
      const customRoleId = customRoleIdByUserId.get(member.user_id);

      formattedUsers.push({
        user_id: member.user_id,
        role: customRoleName || member.role,
        role_id: customRoleId,
        display_name: profile?.display_name || profile?.email || "Unknown User",
        email: profile?.email || "",
        is_owner: false,
        joined_at: member.created_at || new Date().toISOString(),
      });
    });

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      can_manage_users: canManageUsers,
      current_user_id: user.id,
    });
  } catch (error) {
    console.error("Error in workspace users GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = params;

    const { data: workspaceData, error: workspaceError } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    const workspace = workspaceData as { owner_id: string } | null;

    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const canManageUsers = await isWorkspaceOwner(workspaceId, user.id);
    if (!canManageUsers) {
      return NextResponse.json(
        { success: false, error: "Only workspace owners can add users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const emailInput = typeof body?.email === "string" ? body.email.trim() : "";
    const normalizedEmail = emailInput.toLowerCase();
    const role = typeof body?.role === "string" ? body.role : "member";
    const requestedProjectIds = Array.isArray(body?.project_ids)
      ? body.project_ids.filter(
          (projectId: unknown): projectId is string =>
            typeof projectId === "string" && projectId.length > 0
        )
      : [];
    const projectIds = Array.from(new Set(requestedProjectIds));

    if (!normalizedEmail) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const isSystemRole = SYSTEM_ROLES.has(role);
    const serviceClient = createServiceClient();
    const dataClient = serviceClient ?? supabase;

    if (!serviceClient) {
      console.warn(
        "Service role client unavailable in POST /workspaces/[workspaceId]/users - using session client"
      );
    }

    if (!isSystemRole) {
      const { data: customRole, error: customRoleError } = await dataClient
        .from("roles")
        .select("id")
        .eq("id", role)
        .maybeSingle();

      if (customRoleError && getSupabaseErrorCode(customRoleError) !== "PGRST116") {
        console.error("Error validating custom role:", customRoleError);
        return NextResponse.json(
          { success: false, error: "Failed to validate role" },
          { status: 500 }
        );
      }

      if (!customRole) {
        return NextResponse.json(
          { success: false, error: "Invalid role. Role not found" },
          { status: 400 }
        );
      }
    }

    let workspaceProjectIdSet = new Set<string>();
    if (projectIds.length > 0) {
      const { data: workspaceProjects, error: workspaceProjectsError } = await dataClient
        .from("projects")
        .select("id")
        .eq("workspace_id", workspaceId)
        .in("id", projectIds);

      if (workspaceProjectsError) {
        console.error("Error validating selected projects:", workspaceProjectsError);
        return NextResponse.json(
          { success: false, error: "Failed to validate selected projects" },
          { status: 500 }
        );
      }

      workspaceProjectIdSet = new Set((workspaceProjects || []).map((project) => project.id));
      if (workspaceProjectIdSet.size !== projectIds.length) {
        return NextResponse.json(
          { success: false, error: "Niektoré vybrané projekty nepatria do workspace" },
          { status: 400 }
        );
      }
    }

    const { data: targetUserData, error: targetUserError } = await dataClient
      .from("profiles")
      .select("id, email")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    const targetUser = targetUserData as { id: string; email: string } | null;

    if (targetUserError && getSupabaseErrorCode(targetUserError) !== "PGRST116") {
      console.error("Error finding user by email:", targetUserError);
      return NextResponse.json(
        { success: false, error: "Failed to find user by email" },
        { status: 500 }
      );
    }

    if (targetUser?.id === workspace.owner_id) {
      return NextResponse.json(
        { success: false, error: "User is already workspace owner" },
        { status: 400 }
      );
    }

    if (targetUser) {
      const { data: existingMemberData, error: existingMemberError } = await dataClient
        .from("workspace_members")
        .select("id, role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUser.id)
        .maybeSingle();

      const existingMember = existingMemberData as { id: string; role: string } | null;

      if (existingMemberError && getSupabaseErrorCode(existingMemberError) !== "PGRST116") {
        console.error("Error checking existing workspace member:", existingMemberError);
        return NextResponse.json(
          { success: false, error: "Failed to check workspace membership" },
          { status: 500 }
        );
      }

      if (existingMember) {
        if (projectIds.length === 0) {
          return NextResponse.json(
            { success: false, error: "Používateľ je už členom tohto workspace" },
            { status: 400 }
          );
        }

        if (["owner", "admin"].includes(existingMember.role)) {
          return NextResponse.json(
            {
              success: false,
              error: "Používateľ s rolou owner/admin má prístup ku všetkým projektom",
            },
            { status: 400 }
          );
        }

        const { data: allWorkspaceProjects, error: allWorkspaceProjectsError } = await dataClient
          .from("projects")
          .select("id")
          .eq("workspace_id", workspaceId);

        if (allWorkspaceProjectsError) {
          console.error(
            "Error loading workspace projects for membership sync:",
            allWorkspaceProjectsError
          );
          return NextResponse.json(
            { success: false, error: "Failed to update project access" },
            { status: 500 }
          );
        }

        const allWorkspaceProjectIds = (allWorkspaceProjects || []).map((project) => project.id);

        if (allWorkspaceProjectIds.length > 0) {
          const { error: deleteMembershipsError } = await dataClient
            .from("project_members")
            .delete()
            .eq("user_id", targetUser.id)
            .in("project_id", allWorkspaceProjectIds);

          if (deleteMembershipsError) {
            console.error("Error removing previous project memberships:", deleteMembershipsError);
            return NextResponse.json(
              { success: false, error: "Failed to update project access" },
              { status: 500 }
            );
          }
        }

        const newMemberships = projectIds.map((projectId) => ({
          project_id: projectId,
          user_id: targetUser.id,
          role: "member",
        }));

        if (newMemberships.length > 0) {
          const { error: insertMembershipsError } = await dataClient
            .from("project_members")
            .upsert(newMemberships, { onConflict: "project_id,user_id" });

          if (insertMembershipsError) {
            console.error(
              "Error creating project memberships for existing member:",
              insertMembershipsError
            );
            return NextResponse.json(
              { success: false, error: "Failed to update project access" },
              { status: 500 }
            );
          }
        }

        const { error: updateScopeError } = await dataClient
          .from("workspace_members")
          .update({ project_access_scope: "restricted" })
          .eq("workspace_id", workspaceId)
          .eq("user_id", targetUser.id);

        if (updateScopeError) {
          const updateScopeMessage = String(updateScopeError.message || "");
          const missingScopeColumn = updateScopeMessage.includes("project_access_scope");
          if (missingScopeColumn) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "Chýba DB migrácia pre obmedzený prístup k projektom. Spustite migráciu 0079.",
              },
              { status: 500 }
            );
          }
          console.error("Error updating workspace member project scope:", updateScopeError);
          return NextResponse.json(
            { success: false, error: "Failed to update project scope" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Prístup používateľa bol obmedzený na vybrané projekty",
          user_id: targetUser.id,
          email: targetUser.email,
          role: existingMember.role,
          project_ids: projectIds,
        });
      }
    }

    const { data: existingInvitation, error: existingInvitationError } = await dataClient
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvitationError && getSupabaseErrorCode(existingInvitationError) !== "PGRST116") {
      console.error("Error checking existing invitation:", existingInvitationError);
      return NextResponse.json(
        { success: false, error: "Failed to check pending invitations" },
        { status: 500 }
      );
    }

    if (existingInvitation) {
      return NextResponse.json(
        { success: false, error: "Pozvánka na tento email už čaká na prijatie" },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationPayload: Record<string, unknown> = {
      workspace_id: workspaceId,
      email: normalizedEmail,
      role,
      invited_by: user.id,
      token,
      expires_at: expiresAt.toISOString(),
      project_ids: projectIds,
    };

    const { error: invitationError } = await dataClient
      .from("workspace_invitations")
      .insert(invitationPayload);

    if (invitationError) {
      const invitationMessage = String(invitationError.message || "");
      const missingProjectIdsColumn = invitationMessage.includes("project_ids");
      if (missingProjectIdsColumn && projectIds.length === 0) {
        const fallbackPayload = {
          workspace_id: workspaceId,
          email: normalizedEmail,
          role,
          invited_by: user.id,
          token,
          expires_at: expiresAt.toISOString(),
        };

        const { error: fallbackError } = await dataClient
          .from("workspace_invitations")
          .insert(fallbackPayload);

        if (!fallbackError) {
          return NextResponse.json({
            success: true,
            message: "Pozvánka do workspace bola odoslaná.",
            email: normalizedEmail,
            role,
            project_ids: [],
            selected_projects_count: 0,
          });
        }

        console.error("Fallback invitation insert failed:", fallbackError);
      }

      if (missingProjectIdsColumn && projectIds.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Chýba DB migrácia pre pozývanie do konkrétnych projektov. Spustite migráciu 0079.",
          },
          { status: 500 }
        );
      }

      if (isInvitationRoleConstraintError(invitationError)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Chýba DB migrácia pre custom roly v pozvánkach. Spustite migráciu 0080.",
          },
          { status: 500 }
        );
      }

      if (invitationError.code === "23505") {
        return NextResponse.json(
          { success: false, error: "Pozvánka na tento email už bola odoslaná" },
          { status: 400 }
        );
      }
      console.error("Error creating workspace invitation:", invitationError);
      return NextResponse.json(
        { success: false, error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        projectIds.length > 0
          ? "Pozvánka bola odoslaná. Používateľ po prijatí uvidí iba vybrané projekty."
          : "Pozvánka do workspace bola odoslaná.",
      email: normalizedEmail,
      role,
      project_ids: projectIds,
      selected_projects_count: workspaceProjectIdSet.size,
    });
  } catch (error) {
    console.error("Error in workspace users POST:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
