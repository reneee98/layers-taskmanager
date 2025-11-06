/**
 * Client-side permission checking functions
 * These functions call API endpoints and can be used in Client Components
 */

/**
 * Check if current user has permission (client-side)
 * This function calls an API endpoint to check permissions
 */
export async function checkPermission(
  resource: string,
  action: string,
  workspaceId?: string | null
): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      resource,
      action,
    });
    
    if (workspaceId) {
      params.append('workspace_id', workspaceId);
    }
    
    const response = await fetch(`/api/auth/check-permission?${params}`);
    const result = await response.json();
    
    return result.hasPermission === true;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

