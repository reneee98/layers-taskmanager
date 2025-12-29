import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { isWorkspaceOwner } from "@/lib/auth/workspace-security";

export async function DELETE(
  request: NextRequest,
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

    // Check if user is trying to remove themselves
    if (userId === user.id) {
      return NextResponse.json({ success: false, error: "Cannot remove yourself" }, { status: 400 });
    }

    // Check if user is trying to remove another owner
    const { data: targetUser, error: targetUserError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (targetUserError) {
      console.error("Error checking workspace owner:", targetUserError);
      return NextResponse.json({ success: false, error: "Failed to check workspace owner" }, { status: 500 });
    }

    if (targetUser?.owner_id === userId) {
      return NextResponse.json({ success: false, error: "Cannot remove workspace owner" }, { status: 400 });
    }

    // Remove user from workspace
    const { error: removeError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

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