import { createClient } from "@/lib/supabase/server";

/**
 * Check if user has a specific permission
 * @param userId User ID
 * @param resource Resource name (e.g., 'financial', 'projects', 'tasks')
 * @param action Action name (e.g., 'view_prices', 'read', 'create')
 * @param workspaceId Optional workspace ID for workspace-specific permissions
 * @returns true if user has permission, false otherwise
 */
export async function hasPermission(
  userId: string,
  resource: string,
  action: string,
  workspaceId?: string | null
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Check if user is admin (admins have all permissions)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (profile?.role === 'admin') {
      return true;
    }
    
    // Check if user is workspace owner (owners have all permissions in their workspace)
    if (workspaceId) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();
      
      if (workspace?.owner_id === userId) {
        return true;
      }
    }
    
    // Check custom roles via has_permission function
    const { data, error } = await supabase
      .rpc('has_permission', {
        p_user_id: userId,
        p_resource: resource,
        p_action: action,
        p_workspace_id: workspaceId || null
      });
    
    if (error) {
      console.error("Error checking permission:", error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error("Error in hasPermission:", error);
    return false;
  }
}


