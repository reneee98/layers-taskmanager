import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createClient();
    
    // Check if user is owner or member of workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    // SECURITY: Only workspace owners can view invitations
    const isOwner = workspace.owner_id === user.id;
    
    if (!isOwner) {
      console.log(`SECURITY: User ${user.email} is not owner of workspace ${params.workspaceId}, blocking access to invitations`);
      return NextResponse.json({ success: false, error: "Access denied - only workspace owners can view invitations" }, { status: 403 });
    }
    
    // Get pending invitations for this workspace
    const { data: invitations, error } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('workspace_id', params.workspaceId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching invitations:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch invitations" }, { status: 500 });
    }
    
    const rawInvitations = invitations || [];
    const customRoleIds = Array.from(
      new Set(
        rawInvitations
          .map((invitation) => invitation.role)
          .filter((roleValue): roleValue is string => UUID_REGEX.test(String(roleValue || "")))
      )
    );

    const roleNamesById = new Map<string, string>();
    if (customRoleIds.length > 0) {
      const { data: roles } = await supabase.from("roles").select("id, name").in("id", customRoleIds);
      (roles || []).forEach((role) => {
        roleNamesById.set(role.id, role.name);
      });
    }

    const enrichedInvitations = rawInvitations.map((invitation) => ({
      ...invitation,
      role_display: roleNamesById.get(String(invitation.role || "")) || invitation.role,
      role_id: UUID_REGEX.test(String(invitation.role || "")) ? invitation.role : null,
    }));

    return NextResponse.json({ success: true, data: enrichedInvitations });
  } catch (error) {
    console.error("Error in workspace invitations GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
