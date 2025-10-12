import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "./admin";

export async function getUserWorkspaceId(): Promise<string | null> {
  try {
    const user = await getServerUser();

    if (!user) {
      return null;
    }

    const supabase = createClient();

    // Get user's workspace directly from workspaces table
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (error) {
      console.error("Error fetching workspace:", error);
      // If no workspace exists, create one
      const workspaceName = `${user.email?.split('@')[0] || 'User'}'s Workspace`;
      const workspaceDescription = 'Môj workspace';

      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          description: workspaceDescription,
          owner_id: user.id
        })
        .select('id')
        .single();

      if (createError) {
        console.error("Error creating workspace:", createError);
        return null;
      }

      return newWorkspace?.id || null;
    }

    return workspace?.id || null;
  } catch (error) {
    console.error("Error in getUserWorkspaceId:", error);
    return null;
  }
}

export async function getUserWorkspaceIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const user = await getServerUser();
    if (!user) {
      console.log(`DEBUG: No user found, returning null`);
      return null;
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    
    if (workspaceId) {
      console.log(`DEBUG: Using workspace_id from query params: ${workspaceId}`);
      // Verify user has access to this workspace
      const supabase = createClient();
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();
      
      if (workspace) {
        const isOwner = workspace.owner_id === user.id;
        const { data: member } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .single();
        
        if (isOwner || member) {
          return workspaceId;
        } else {
          console.log(`SECURITY: User ${user.email} has no access to workspace ${workspaceId}`);
          return null;
        }
      }
    }
    
    // Try to get from cookie
    const cookieWorkspaceId = request.cookies.get('currentWorkspaceId')?.value;
    if (cookieWorkspaceId) {
      console.log(`DEBUG: Using workspace_id from cookie: ${cookieWorkspaceId}`);
      // Verify user has access to this workspace
      const supabase = createClient();
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', cookieWorkspaceId)
        .single();
      
      if (workspace) {
        const isOwner = workspace.owner_id === user.id;
        const { data: member } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', cookieWorkspaceId)
          .eq('user_id', user.id)
          .single();
        
        if (isOwner || member) {
          return cookieWorkspaceId;
        } else {
          console.log(`SECURITY: User ${user.email} has no access to cookie workspace ${cookieWorkspaceId}`);
          return null;
        }
      }
    }
    
    // Fallback to user's default workspace
    const userWorkspaceId = await getUserWorkspaceId();
    console.log(`DEBUG: Using user's default workspace: ${userWorkspaceId}`);
    return userWorkspaceId;
  } catch (error) {
    console.error("Error in getUserWorkspaceIdFromRequest:", error);
    return null;
  }
}

export async function getUserWorkspaceIdOrThrow(): Promise<string> {
  const workspaceId = await getUserWorkspaceId();
  
  if (!workspaceId) {
    throw new Error("Failed to create or retrieve user workspace");
  }
  
  return workspaceId;
}
