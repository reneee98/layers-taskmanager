import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { isWorkspaceOwner } from "@/lib/auth/workspace-security";

const SYSTEM_ROLES = new Set(["owner", "member"]);

function getSupabaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const errorCode = (error as { code?: unknown }).code;
  return typeof errorCode === "string" ? errorCode : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceId: string; userId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, userId } = params;
    const body = await request.json();
    const { role } = body;

    if (!role || typeof role !== "string") {
      return NextResponse.json({ success: false, error: "Role is required" }, { status: 400 });
    }

    const isOwner = await isWorkspaceOwner(workspaceId, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: "Only workspace owners can change user roles" }, { status: 403 });
    }

    // Prevent owner from changing their own role
    if (userId === user.id) {
      return NextResponse.json({ success: false, error: "Cannot change your own role" }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const dataClient = serviceClient ?? supabase;

    if (!serviceClient) {
      console.warn("Service role client unavailable in PATCH /users/[userId]/role - using session client");
    }

    const { data: workspaceData, error: workspaceError } = await dataClient
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();

    const workspace = workspaceData as { owner_id: string } | null;

    if (workspaceError && getSupabaseErrorCode(workspaceError) !== "PGRST116") {
      console.error("Error checking workspace owner:", workspaceError);
      return NextResponse.json({ success: false, error: "Failed to verify workspace" }, { status: 500 });
    }

    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    if (workspace.owner_id === userId) {
      return NextResponse.json({ success: false, error: "Cannot change the role of another workspace owner" }, { status: 400 });
    }

    const { data: targetMembershipData, error: targetMembershipError } = await dataClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    const targetMembership = targetMembershipData as { id: string } | null;

    if (targetMembershipError && getSupabaseErrorCode(targetMembershipError) !== "PGRST116") {
      console.error("Error checking target user membership:", targetMembershipError);
      return NextResponse.json({ success: false, error: "Failed to verify target user membership" }, { status: 500 });
    }

    if (!targetMembership) {
      return NextResponse.json({ success: false, error: "User is not a member of this workspace" }, { status: 404 });
    }

    const isSystemRole = SYSTEM_ROLES.has(role);
    if (!isSystemRole) {
      const { data: customRole, error: customRoleError } = await dataClient
        .from("roles")
        .select("id")
        .eq("id", role)
        .maybeSingle();

      if (customRoleError && getSupabaseErrorCode(customRoleError) !== "PGRST116") {
        console.error("Error validating custom role:", customRoleError);
        return NextResponse.json({ success: false, error: "Failed to validate role" }, { status: 500 });
      }

      if (!customRole) {
        return NextResponse.json({
          success: false,
          error: "Invalid role. Role not found"
        }, { status: 400 });
      }
    }

    if (isSystemRole) {
      const { error: updateError } = await dataClient
        .from("workspace_members")
        .update({ role: role })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating user role:", updateError);
        return NextResponse.json({ success: false, error: "Failed to update user role" }, { status: 500 });
      }

      const { error: cleanupRoleError } = await dataClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId);

      if (cleanupRoleError) {
        console.error("Error clearing custom role after system role update:", cleanupRoleError);
      }
    } else {
      const { error: updateMemberError } = await dataClient
        .from("workspace_members")
        .update({ role: "member" })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);

      if (updateMemberError) {
        console.error("Error updating workspace member role:", updateMemberError);
        return NextResponse.json({ success: false, error: "Failed to update user role" }, { status: 500 });
      }

      const { error: upsertUserRoleError } = await dataClient
        .from("user_roles")
        .upsert(
          {
            user_id: userId,
            role_id: role,
            workspace_id: workspaceId
          },
          { onConflict: "workspace_id,user_id" }
        );

      if (upsertUserRoleError) {
        console.error("Error creating/updating user role:", upsertUserRoleError);
        return NextResponse.json({ success: false, error: "Failed to update user role" }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "User role updated successfully",
      role: role 
    });
  } catch (error) {
    console.error("Error in user role PATCH:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
