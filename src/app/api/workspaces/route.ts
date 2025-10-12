import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createClient();
    
    // Get all workspaces where user is owner or member
    const { data: ownedWorkspaces, error: ownedError } = await supabase
      .from('workspaces')
      .select('id, name, description, owner_id, created_at')
      .eq('owner_id', user.id);
    
    console.log(`DEBUG: User ${user.email} (${user.id}) owned workspaces:`, ownedWorkspaces);
    
    if (ownedError) {
      console.error("Error fetching owned workspaces:", ownedError);
      return NextResponse.json({ success: false, error: "Failed to fetch workspaces" }, { status: 500 });
    }
    
    // Get workspaces where user is a member
    const { data: memberWorkspaces, error: memberError } = await supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        role,
        workspaces(id, name, description, owner_id, created_at)
      `)
      .eq('user_id', user.id);
    
    console.log(`DEBUG: User ${user.email} (${user.id}) member workspaces:`, memberWorkspaces);
    
    if (memberError) {
      console.error("Error fetching member workspaces:", memberError);
      return NextResponse.json({ success: false, error: "Failed to fetch member workspaces" }, { status: 500 });
    }
    
    // Combine owned and member workspaces
    const allWorkspaces = [];
    
    // Add owned workspaces
    if (ownedWorkspaces) {
      ownedWorkspaces.forEach(workspace => {
        allWorkspaces.push({
          ...workspace,
          role: 'owner'
        });
      });
    }
    
    // Add member workspaces
    if (memberWorkspaces) {
      memberWorkspaces.forEach(member => {
        if (member.workspaces) {
          allWorkspaces.push({
            ...member.workspaces,
            role: member.role
          });
        }
      });
    }
    
    // If no workspaces exist, create one
    if (allWorkspaces.length === 0) {
      const workspaceName = `${user.email?.split('@')[0] || 'User'}'s Workspace`;
      const workspaceDescription = 'Môj workspace';
      
      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          description: workspaceDescription,
          owner_id: user.id
        })
        .select('id, name, description, owner_id, created_at')
        .single();
      
      if (createError) {
        return NextResponse.json({ success: false, error: "Failed to create workspace" }, { status: 500 });
      }
      
      allWorkspaces.push({
        ...newWorkspace,
        role: 'owner'
      });
    }
    
    // SECURITY FIX: Remove "Layers" workspace from users who are not owners or members
    const filteredWorkspaces = allWorkspaces.filter(workspace => {
      if (workspace.name === 'Layers s.r.o.') {
        // Only allow if user is owner or explicitly a member
        const isOwner = workspace.owner_id === user.id;
        const isMember = memberWorkspaces?.some(member => 
          member.workspaces?.id === workspace.id
        );
        
        if (!isOwner && !isMember) {
          console.log(`SECURITY: Blocking Layers workspace access for user ${user.email} - not owner or member`);
          return false;
        }
      }
      return true;
    });
    
    console.log(`DEBUG: Final workspaces for user ${user.email}:`, filteredWorkspaces);
    return NextResponse.json({ success: true, data: filteredWorkspaces });
  } catch (error) {
    console.error("Error in workspaces GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, description } = body;
    
    if (!name) {
      return NextResponse.json({ success: false, error: "Workspace name is required" }, { status: 400 });
    }
    
    const supabase = createClient();
    
    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name,
        description,
        owner_id: user.id
      })
      .select()
      .single();
    
    if (workspaceError) {
      console.error("Error creating workspace:", workspaceError);
      return NextResponse.json({ success: false, error: "Failed to create workspace" }, { status: 500 });
    }
    
    // Add user as owner of the workspace
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
        joined_at: new Date().toISOString()
      });
    
    if (memberError) {
      console.error("Error adding user as workspace member:", memberError);
      return NextResponse.json({ success: false, error: "Failed to add user to workspace" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: { ...workspace, role: 'owner' } });
  } catch (error) {
    console.error("Error in workspaces POST:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
