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
    
    console.log("Workspace-users API called with workspaceId:", workspaceId);
    
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
    
    console.log(`SECURITY: User ${user.email} accessing workspace users - Owner: ${isOwner}, Member: ${!!member}`);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    
    // Get workspace members (invited members only)
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('id, role, user_id')
      .eq('workspace_id', workspaceId);
    
    console.log("Workspace members:", members);
    
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
        .select('id, email, display_name, role')
        .in('id', userIds);
      
      if (profilesError) {
        console.error("Error fetching member profiles:", profilesError);
        return NextResponse.json({ success: false, error: "Failed to fetch member profiles" }, { status: 500 });
      }
      
      // Map display_name to name for frontend compatibility
      memberProfiles = (profiles || []).map(profile => ({
        ...profile,
        name: profile.display_name || profile.email?.split('@')[0] || 'Neznámy'
      }));
    }
    
    // Get all users who have access to this workspace
    // This includes users who are assigned to tasks or have time entries
    const { data: taskAssignees, error: assigneesError } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('workspace_id', workspaceId);
    
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select('user_id')
      .eq('workspace_id', workspaceId);
    
    console.log("Task assignees:", taskAssignees);
    console.log("Time entries:", timeEntries);
    
    if (assigneesError) {
      console.error("Error fetching task assignees:", assigneesError);
      return NextResponse.json({ success: false, error: "Failed to fetch task assignees" }, { status: 500 });
    }
    
    if (timeEntriesError) {
      console.error("Error fetching time entries:", timeEntriesError);
      return NextResponse.json({ success: false, error: "Failed to fetch time entries" }, { status: 500 });
    }
    
    // Get unique user IDs
    const userIds = new Set();
    if (taskAssignees) {
      taskAssignees.forEach(assignee => userIds.add(assignee.user_id));
    }
    if (timeEntries) {
      timeEntries.forEach(entry => userIds.add(entry.user_id));
    }
    
    console.log("Unique user IDs:", Array.from(userIds));
    
    // Get profiles for all unique users
    let assigneeProfiles: any[] = [];
    if (userIds.size > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name, role')
        .in('id', Array.from(userIds));
      
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return NextResponse.json({ success: false, error: "Failed to fetch profiles" }, { status: 500 });
      }
      
      // Map display_name to name for frontend compatibility
      assigneeProfiles = (profiles || []).map(profile => ({
        ...profile,
        name: profile.display_name || profile.email?.split('@')[0] || 'Neznámy'
      }));
    }
    
    console.log("Assignee profiles:", assigneeProfiles);
    
    // Get owner profile (using workspace from earlier)
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('id, email, display_name, role')
      .eq('id', workspace.owner_id)
      .single();
    
    console.log("Workspace owner:", ownerProfile);
    
    if (ownerError) {
      console.error("Error fetching owner profile:", ownerError);
      return NextResponse.json({ success: false, error: "Failed to fetch owner profile" }, { status: 500 });
    }
    
    // Combine owner, members, and task assignees
    const allUsers = [];
    const userIdsCombined = new Set(); // To avoid duplicates
    
    // Add owner
    if (ownerProfile) {
      allUsers.push({
        id: ownerProfile.id,
        email: ownerProfile.email,
        name: ownerProfile.display_name || ownerProfile.email.split('@')[0],
        display_name: ownerProfile.display_name || ownerProfile.email.split('@')[0],
        avatar_url: null,
        role: 'owner'
      });
      userIdsCombined.add(ownerProfile.id);
    }
    
    // Add members
    if (members && memberProfiles) {
      members.forEach(member => {
        const profile = memberProfiles.find(p => p.id === member.user_id);
        if (profile && !userIdsCombined.has(profile.id)) {
          allUsers.push({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            display_name: profile.display_name || profile.email.split('@')[0],
            avatar_url: null,
            role: member.role
          });
          userIdsCombined.add(profile.id);
        }
      });
    }
    
    // Add task assignees
    if (assigneeProfiles && assigneeProfiles.length > 0) {
      assigneeProfiles.forEach(profile => {
        if (!userIdsCombined.has(profile.id)) {
          allUsers.push({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            display_name: profile.display_name || profile.email.split('@')[0],
            avatar_url: null,
            role: 'assignee'
          });
          userIdsCombined.add(profile.id);
        }
      });
    }
    
    // Apply search filter if provided
    let filteredUsers = allUsers;
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

    console.log("Final users list:", users);

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error in workspace-users GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
