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
        .from('profiles')
        .select('id, email, display_name')
        .in('id', userIds);
      
      if (profilesError) {
        console.error("Error fetching member profiles:", profilesError);
        return NextResponse.json({ success: false, error: "Failed to fetch member profiles" }, { status: 500 });
      }
      
      memberProfiles = profiles || [];
    }
    
    // Combine members with profiles
    const membersWithProfiles = members?.map(member => ({
      ...member,
      user: memberProfiles.find(p => p.id === member.user_id)
    })) || [];
    
    return NextResponse.json({ success: true, data: membersWithProfiles });
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
    
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }
    
    const supabase = createClient();
    
    // Check if user is owner or admin of workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', params.workspaceId)
      .eq('user_id', user.id)
      .single();
    
    if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
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
    
    if (existingUser) {
      // User exists, add them directly
      const { error: addError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: params.workspaceId,
          user_id: existingUser.id,
          role,
          invited_by: user.id,
          joined_at: new Date().toISOString()
        });
      
      if (addError) {
        if (addError.code === '23505') {
          return NextResponse.json({ success: false, error: "User is already a member" }, { status: 400 });
        }
        console.error("Error adding member:", addError);
        return NextResponse.json({ success: false, error: "Failed to add member" }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, message: "User added to workspace" });
    } else {
      // User doesn't exist, create invitation
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
    }
  } catch (error) {
    console.error("Error in workspace members POST:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
