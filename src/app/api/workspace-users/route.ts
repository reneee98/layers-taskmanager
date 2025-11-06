import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { withOwnerSecurity } from "@/lib/auth/api-security";

export async function GET(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const supabase = createClient();
    
    // SECURITY: Check if user has access to the workspace (owner or member)
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is owner or member of the workspace
    // Check if user is owner (either workspace owner or has owner role)
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    const isOwner = workspace.owner_id === user.id || member?.role === 'owner';
    
    if (!isOwner && !member) {
      console.log(`SECURITY: User ${user.email} has no access to workspace ${workspaceId}`);
      return NextResponse.json({ success: false, error: "Access denied - not a member of this workspace" }, { status: 403 });
    }
    
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
    
    // Get all user IDs that should have access to this workspace
    // PRIMARY: All workspace_members + owner (these are the users added to workspace)
    const validUserIds = new Set<string>();
    
    // Add owner (always include owner)
    validUserIds.add(workspace.owner_id);
    
    // Add all workspace members (these are users explicitly added to workspace)
    if (members && members.length > 0) {
      members.forEach(m => validUserIds.add(m.user_id));
    }
    
    // Get all profiles for valid users (owner + all workspace_members)
    const userIdsArray = Array.from(validUserIds);
    
    if (userIdsArray.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }
    
    // Get all profiles for valid users (owner + all workspace_members)
    // Use service role client to bypass RLS if needed
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, display_name, role')
      .in('id', userIdsArray);
    
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json({ success: false, error: "Failed to fetch profiles" }, { status: 500 });
    }
    
    // Create a map of user_id -> workspace_member role
    const memberRoleMap = new Map<string, string>();
    if (members) {
      members.forEach(m => memberRoleMap.set(m.user_id, m.role));
    }
    
    // Build the users list
    interface WorkspaceUser {
      id: string;
      email: string;
      name: string;
      display_name: string;
      avatar_url: string | null;
      role: string;
    }
    const allUsers: WorkspaceUser[] = [];
    const userIdsCombined = new Set<string>();
    const profilesMap = new Map<string, { id: string; email: string; display_name: string | null; role: string }>();
    
    // Create a map of profiles for quick lookup
    if (allProfiles) {
      allProfiles.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
    }
    
    // Process all valid user IDs (owner + workspace_members)
    userIdsArray.forEach(userId => {
      if (userIdsCombined.has(userId)) return;
      
      const profile = profilesMap.get(userId);
      
      // Determine role: owner if workspace owner, otherwise member role or 'member' as default
      let userRole = 'member';
      if (userId === workspace.owner_id) {
        userRole = 'owner';
      } else if (memberRoleMap.has(userId)) {
        userRole = memberRoleMap.get(userId) || 'member';
      }
      
      // If profile exists, use it; otherwise create a minimal user object from workspace_members
      if (profile) {
        // Ensure display_name is always a string, never null or undefined
        // If display_name is null or undefined, try to get it from email or use fallback
        let displayName = profile.display_name || null;
        
        // If display_name is null, undefined, or empty, try to extract from email
        if (!displayName || (typeof displayName === 'string' && displayName.trim() === '')) {
          // Try to get a better name from email
          const emailParts = profile.email?.split('@')[0] || '';
          if (emailParts) {
            // Capitalize first letter
            displayName = emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
          }
        }
        
        // Final fallback
        if (!displayName || (typeof displayName === 'string' && displayName.trim() === '')) {
          displayName = profile.email || 'Neznámy';
        }
        
        const email = profile.email || 'unknown@email.com';
        
          allUsers.push({
            id: profile.id,
          email: email,
          name: displayName,
          display_name: displayName,
            avatar_url: null,
          role: userRole
        });
      } else {
        // Fallback: user doesn't have a profile, but is in workspace_members
        // Try to get email from auth.users or use a placeholder
        const member = members?.find(m => m.user_id === userId);
        allUsers.push({
          id: userId,
          email: `user-${userId.substring(0, 8)}@unknown`,
          name: 'Neznámy používateľ',
          display_name: 'Neznámy používateľ',
          avatar_url: null,
          role: userRole
        });
      }
      
      userIdsCombined.add(userId);
    });
    
    // Apply search filter if provided
    let filteredUsers: WorkspaceUser[] = allUsers;
    if (search) {
      filteredUsers = allUsers.filter(user => 
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(search.toLowerCase())) ||
        (user.display_name && user.display_name.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // Transform to match the expected format for assignee components
    const users = filteredUsers.map(user => ({
      id: user.id,
      name: user.name || user.display_name,
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
