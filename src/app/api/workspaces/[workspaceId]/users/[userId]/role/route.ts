import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isWorkspaceOwner } from "@/lib/auth/workspace-security";

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

    if (!role) {
      return NextResponse.json({ success: false, error: "Role is required" }, { status: 400 });
    }

    if (!['owner', 'member'].includes(role)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid role. Must be 'owner' or 'member'" 
      }, { status: 400 });
    }

    // Check if current user is owner of the workspace
    const isOwner = await isWorkspaceOwner(workspaceId, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: "Only workspace owners can change user roles" }, { status: 403 });
    }

    // Prevent owner from changing their own role
    if (userId === user.id) {
      return NextResponse.json({ success: false, error: "Cannot change your own role" }, { status: 400 });
    }

    // Prevent changing the role of another owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspace?.owner_id === userId) {
      return NextResponse.json({ success: false, error: "Cannot change the role of another workspace owner" }, { status: 400 });
    }

    // Update user role in workspace_members table
    const { error: updateError } = await supabase
      .from('workspace_members')
      .update({ role: role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (updateError) {
      console.error("Error updating user role:", updateError);
      return NextResponse.json({ success: false, error: "Failed to update user role" }, { status: 500 });
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
