import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; memberId: string } }
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
    
    // Only owner can remove members
    if (workspace.owner_id !== user.id) {
      return NextResponse.json({ success: false, error: "Only workspace owner can remove members" }, { status: 403 });
    }
    
    // Get the member to be removed
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('id', params.memberId)
      .eq('workspace_id', params.workspaceId)
      .single();
    
    if (memberError || !member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }
    
    // Remove the member
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', params.memberId);
    
    if (deleteError) {
      console.error("Error removing member:", deleteError);
      return NextResponse.json({ success: false, error: "Failed to remove member" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: "Member removed successfully" });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
