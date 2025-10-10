import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdOrThrow } from "@/lib/auth/workspace";

export async function GET(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdOrThrow();
    
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    
    // Get workspace members (invited members only)
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('id, role, user_id')
      .eq('workspace_id', workspaceId);
    
    if (membersError) {
      console.error("Error fetching workspace members:", membersError);
      return NextResponse.json({ success: false, error: "Failed to fetch workspace members" }, { status: 500 });
    }
    
    // Get profiles for members
    let memberProfiles: any[] = [];
    if (members && members.length > 0) {
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .in('id', userIds);
      
      if (profilesError) {
        console.error("Error fetching member profiles:", profilesError);
        return NextResponse.json({ success: false, error: "Failed to fetch member profiles" }, { status: 500 });
      }
      
      memberProfiles = profiles || [];
    }
    
    // Get workspace owner
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json({ success: false, error: "Failed to fetch workspace" }, { status: 500 });
    }
    
    // Get owner profile
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url')
      .eq('id', workspace.owner_id)
      .single();
    
    if (ownerError) {
      console.error("Error fetching owner profile:", ownerError);
      return NextResponse.json({ success: false, error: "Failed to fetch owner profile" }, { status: 500 });
    }
    
    // Combine owner and members
    const allUsers = [];
    
    // Add owner
    if (ownerProfile) {
      allUsers.push({
        id: ownerProfile.id,
        email: ownerProfile.email,
        display_name: ownerProfile.display_name,
        avatar_url: ownerProfile.avatar_url,
        role: 'owner'
      });
    }
    
    // Add members
    if (members && memberProfiles) {
      members.forEach(member => {
        const profile = memberProfiles.find(p => p.id === member.user_id);
        if (profile) {
          allUsers.push({
            id: profile.id,
            email: profile.email,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            role: member.role
          });
        }
      });
    }
    
    // Apply search filter if provided
    let filteredUsers = allUsers;
    if (search) {
      filteredUsers = allUsers.filter(user => 
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.display_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Transform to match the expected format for assignee components
    const users = filteredUsers.map(user => ({
      id: user.id,
      name: user.display_name,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role
    }));
    
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error in workspace-users GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
