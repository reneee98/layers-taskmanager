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
    
    // Get user's workspace directly from workspaces table
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('id, name, description, owner_id, created_at')
      .eq('owner_id', user.id)
      .single();
    
    if (error) {
      console.error("Error fetching workspace:", error);
      // If no workspace exists, create one
      const workspaceName = user.email === 'design@renemoravec.sk' 
        ? 'Layers s.r.o.' 
        : `${user.email?.split('@')[0] || 'User'}'s Workspace`;
      
      const workspaceDescription = user.email === 'design@renemoravec.sk'
        ? 'Hlavný workspace pre Layers s.r.o.'
        : 'Môj workspace';
      
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
      
      const workspaceWithRole = {
        ...newWorkspace,
        role: 'owner'
      };
      
      return NextResponse.json({ success: true, data: workspaceWithRole });
    }
    
    // Add role to workspace data
    const workspaceWithRole = {
      ...workspace,
      role: 'owner'
    };
    
    return NextResponse.json({ success: true, data: workspaceWithRole });
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
