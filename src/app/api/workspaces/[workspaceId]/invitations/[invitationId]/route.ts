import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; invitationId: string } }
) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createClient();
    
    // Check if user is owner of workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    // Only owner can cancel invitations
    if (workspace.owner_id !== user.id) {
      return NextResponse.json({ success: false, error: "Only workspace owner can cancel invitations" }, { status: 403 });
    }
    
    // Get the invitation to be cancelled
    const { data: invitation, error: invitationError } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('id', params.invitationId)
      .eq('workspace_id', params.workspaceId)
      .single();
    
    if (invitationError || !invitation) {
      return NextResponse.json({ success: false, error: "Invitation not found" }, { status: 404 });
    }
    
    // Cancel the invitation (set status to declined)
    const { error: updateError } = await supabase
      .from('workspace_invitations')
      .update({ status: 'declined' })
      .eq('id', params.invitationId);
    
    if (updateError) {
      console.error("Error cancelling invitation:", updateError);
      return NextResponse.json({ success: false, error: "Failed to cancel invitation" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: "Invitation cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
