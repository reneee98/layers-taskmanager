import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { getServerUser } from "@/lib/auth/admin";
import { isWorkspaceOwner } from "@/lib/auth/workspace-security";

function getSupabaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const errorCode = (error as { code?: unknown }).code;
  return typeof errorCode === "string" ? errorCode : null;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { workspaceId: string; userId: string } }
) {
  try {
    const { workspaceId, userId } = params;
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = await isWorkspaceOwner(workspaceId, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: "Only workspace owners can remove users" }, { status: 403 });
    }

    const supabase = createClient();
    const serviceClient = createServiceClient();
    const dataClient = serviceClient ?? supabase;

    if (!serviceClient) {
      console.warn("Service role client unavailable in DELETE /users/[userId] - using session client");
    }

    // Check if user is trying to remove themselves
    if (userId === user.id) {
      return NextResponse.json({ success: false, error: "Cannot remove yourself" }, { status: 400 });
    }

    // Check if user is trying to remove another owner
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
      return NextResponse.json({ success: false, error: "Cannot remove workspace owner" }, { status: 400 });
    }

    const { data: existingMembershipData, error: existingMembershipError } = await dataClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    const existingMembership = existingMembershipData as { id: string } | null;

    if (existingMembershipError && getSupabaseErrorCode(existingMembershipError) !== "PGRST116") {
      console.error("Error checking existing membership before delete:", existingMembershipError);
      return NextResponse.json({ success: false, error: "Failed to verify workspace membership" }, { status: 500 });
    }

    if (!existingMembership) {
      return NextResponse.json({ success: false, error: "User is not a member of this workspace" }, { status: 404 });
    }

    const { error: deleteCustomRoleError } = await dataClient
      .from("user_roles")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (deleteCustomRoleError) {
      console.error("Error deleting custom role assignment during user removal:", deleteCustomRoleError);
    }

    const { error: removeError } = await dataClient
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (removeError) {
      console.error("Error removing user from workspace:", removeError);
      return NextResponse.json({ success: false, error: "Failed to remove user from workspace" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "User removed from workspace successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/workspaces/[workspaceId]/users/[userId]:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
