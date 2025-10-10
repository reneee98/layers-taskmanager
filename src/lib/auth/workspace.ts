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

export async function getUserWorkspaceIdOrThrow(): Promise<string> {
  const workspaceId = await getUserWorkspaceId();
  
  if (!workspaceId) {
    throw new Error("Failed to create or retrieve user workspace");
  }
  
  return workspaceId;
}
