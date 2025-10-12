import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

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
    
    // Check if user has access to workspace (is owner or member)
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    // Check if user is owner or member
    const isOwner = workspace.owner_id === user.id;
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', params.workspaceId)
      .eq('user_id', user.id)
      .single();
    
    if (!isOwner && !member) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }
    
    // Get workspace members
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('id, role, joined_at, created_at, user_id')
      .eq('workspace_id', params.workspaceId);
    
    if (error) {
      console.error("Error fetching workspace members:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch members" }, { status: 500 });
    }
    
    // Get profiles for members
    let memberProfiles: any[] = [];
    if (members && members.length > 0) {
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email, name')
        .in('id', userIds);
      
      if (profilesError) {
        console.error("Error fetching member profiles:", profilesError);
        return NextResponse.json({ success: false, error: "Failed to fetch member profiles" }, { status: 500 });
      }
      
      memberProfiles = profiles || [];
    }
    
    // Get owner profile
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('user_profiles')
      .select('id, email, name')
      .eq('id', workspace.owner_id)
      .single();
    
    if (ownerError) {
      console.error("Error fetching owner profile:", ownerError);
      return NextResponse.json({ success: false, error: "Failed to fetch owner profile" }, { status: 500 });
    }
    
    // Combine members with profiles
    const membersWithProfiles = members?.map(member => ({
      ...member,
      user: memberProfiles.find(p => p.id === member.user_id)
    })) || [];
    
    // Add owner to the list
    const allMembers = [
      {
        id: `owner-${workspace.owner_id}`,
        role: 'owner',
        user: ownerProfile,
        joined_at: null,
        created_at: null
      },
      ...membersWithProfiles
    ];
    
    return NextResponse.json({ success: true, data: allMembers });
  } catch (error) {
    console.error("Error in workspace members GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { email, role = 'member' } = body;
    
    console.log("Received invitation data:", { email, role });
    
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }
    
    // Validate role - only 'member' is allowed for workspace_members
    if (role !== 'member') {
      console.log("Invalid role received:", role);
      return NextResponse.json({ success: false, error: "Only 'member' role is allowed" }, { status: 400 });
    }
    
    const supabase = createClient();
    
    // Check if user is owner or admin of workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const isOwner = workspace.owner_id === user.id;
    
    // Check if user is a member with admin role
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', params.workspaceId)
      .eq('user_id', user.id)
      .single();
    
    const isAdmin = member && member.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    
    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      console.error("Error checking user:", userError);
      return NextResponse.json({ success: false, error: "Failed to check user" }, { status: 500 });
    }
    
    // Always create invitation (don't add directly to workspace_members)
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    const { error: inviteError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: params.workspaceId,
        email,
        role,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString()
      });
    
    if (inviteError) {
      if (inviteError.code === '23505') {
        return NextResponse.json({ success: false, error: "Invitation already sent to this email" }, { status: 400 });
      }
      console.error("Error creating invitation:", inviteError);
      return NextResponse.json({ success: false, error: "Failed to create invitation" }, { status: 500 });
    }
    
    // TODO: Send email invitation
    
    return NextResponse.json({ success: true, message: "Invitation sent" });
  } catch (error) {
    console.error("Error in workspace members POST:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
