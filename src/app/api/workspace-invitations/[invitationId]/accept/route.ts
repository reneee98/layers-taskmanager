import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createClient();
    
    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('id', params.invitationId)
      .eq('email', user.email)
      .eq('status', 'pending')
      .single();
    
    if (invitationError || !invitation) {
      return NextResponse.json({ success: false, error: "Invitation not found or expired" }, { status: 404 });
    }
    
    // Check if invitation is still valid
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "Invitation has expired" }, { status: 400 });
    }
    
    // Add user to workspace_members
    const { error: addError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.invited_by
      });
    
    if (addError) {
      if (addError.code === '23505') {
        return NextResponse.json({ success: false, error: "You are already a member of this workspace" }, { status: 400 });
      }
      console.error("Error adding member:", addError);
      return NextResponse.json({ success: false, error: "Failed to join workspace" }, { status: 500 });
    }
    
    // Update invitation status to accepted
    const { error: updateError } = await supabase
      .from('workspace_invitations')
      .update({ status: 'accepted' })
      .eq('id', params.invitationId);
    
    if (updateError) {
      console.error("Error updating invitation:", updateError);
      // Don't fail the request, just log the error
    }
    
    return NextResponse.json({ success: true, message: "Successfully joined workspace" });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
