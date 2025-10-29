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
    
    // SECURITY: Zobrazujeme len používateľov, ktorí SÚ členmi workspace
    // NEFILTRUJEME podľa task_assignees alebo time_entries, lebo by to zobrazovalo
    // používateľov, ktorí nie sú členmi workspace - narušenie súkromia!
    
    // Vytvoríme zoznam platných používateľov - len owner a members
    const validUserIds = new Set<string>();
    
    // Pridaj owner
    validUserIds.add(workspace.owner_id);
    
    // Pridaj všetkých členov workspace
    if (members && members.length > 0) {
      members.forEach(m => validUserIds.add(m.user_id));
    }
    
    console.log("Valid workspace user IDs (owner + members only):", Array.from(validUserIds));
    
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
    
    // SECURITY: Combine owner and members ONLY - žiadni task assignees alebo time entries!
    // Používatelia, ktorí nie sú členmi workspace, NEMÔŽU byť zobrazení
    const allUsers = [];
    const userIdsCombined = new Set<string>(); // To avoid duplicates
    
    // Add owner (len ak je v validUserIds)
    if (ownerProfile && validUserIds.has(ownerProfile.id)) {
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
    
    // Add members (len členovia workspace, nie task assignees!)
    if (members && memberProfiles) {
      members.forEach(member => {
        // SECURITY CHECK: Skontroluj, či je používateľ skutočne v validUserIds
        if (!validUserIds.has(member.user_id)) {
          console.log(`SECURITY: Skipping user ${member.user_id} - not a valid workspace member`);
          return;
        }
        
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
    
    // SECURITY: NEPRIDÁVAME task assignees ani time entries - len členovia workspace!
    
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
