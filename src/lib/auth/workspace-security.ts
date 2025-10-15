import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

export interface WorkspaceAccessResult {
  hasAccess: boolean;
  isOwner: boolean;
  isMember: boolean;
  workspaceId: string;
  error?: string;
}

/**
 * Comprehensive workspace access validation
 * This function ensures users can only access workspaces they own or are members of
 */
export async function validateWorkspaceAccess(
  request: NextRequest,
  workspaceId?: string
): Promise<WorkspaceAccessResult> {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return {
        hasAccess: false,
        isOwner: false,
        isMember: false,
        workspaceId: workspaceId || '',
        error: "User not authenticated"
      };
    }

    // Get workspace_id from various sources
    const finalWorkspaceId = workspaceId || 
      request.nextUrl.searchParams.get('workspace_id') ||
      request.cookies.get('currentWorkspaceId')?.value;

    if (!finalWorkspaceId) {
      return {
        hasAccess: false,
        isOwner: false,
        isMember: false,
        workspaceId: '',
        error: "No workspace ID provided"
      };
    }

    const supabase = createClient();

    // Get workspace details
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('id', finalWorkspaceId)
      .single();

    if (workspaceError || !workspace) {
      return {
        hasAccess: false,
        isOwner: false,
        isMember: false,
        workspaceId: finalWorkspaceId,
        error: "Workspace not found"
      };
    }

    // Check if user is owner
    const isOwner = workspace.owner_id === user.id;

    // Check if user is member
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', finalWorkspaceId)
      .eq('user_id', user.id)
      .single();

    const isMember = !!member;
    const hasAccess = isOwner || isMember;

    // Log access attempt for security monitoring
    if (hasAccess) {
      console.log(`SECURITY: User ${user.email} accessed workspace ${workspace.name} (${finalWorkspaceId}) - Owner: ${isOwner}, Member: ${isMember}`);
    } else {
      console.log(`SECURITY: User ${user.email} denied access to workspace ${workspace.name} (${finalWorkspaceId})`);
    }

    return {
      hasAccess,
      isOwner,
      isMember,
      workspaceId: finalWorkspaceId,
      error: hasAccess ? undefined : "Access denied - not owner or member of workspace"
    };

  } catch (error) {
    console.error("Error in validateWorkspaceAccess:", error);
    return {
      hasAccess: false,
      isOwner: false,
      isMember: false,
      workspaceId: workspaceId || '',
      error: "Internal server error"
    };
  }
}

/**
 * Validate that user can only access data from their workspace
 */
export async function validateWorkspaceDataAccess(
  request: NextRequest,
  dataWorkspaceId: string
): Promise<WorkspaceAccessResult> {
  const accessResult = await validateWorkspaceAccess(request, dataWorkspaceId);
  
  if (!accessResult.hasAccess) {
    return accessResult;
  }

  // Additional validation: ensure the data belongs to the workspace
  if (accessResult.workspaceId !== dataWorkspaceId) {
    return {
      hasAccess: false,
      isOwner: false,
      isMember: false,
      workspaceId: dataWorkspaceId,
      error: "Data workspace ID mismatch"
    };
  }

  return accessResult;
}

/**
 * Get all workspaces user has access to
 */
export async function getUserAccessibleWorkspaces(userId: string) {
  try {
    const supabase = createClient();

    // Get owned workspaces - use service role to bypass RLS
    const { data: ownedWorkspaces, error: ownedError } = await supabase
      .from('workspaces')
      .select('id, name, description, owner_id, created_at')
      .eq('owner_id', userId);

    if (ownedError) {
      console.error("Error fetching owned workspaces:", ownedError);
      return [];
    }

    // Get member workspaces - use service role to bypass RLS
    const { data: memberWorkspaces, error: memberError } = await supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        role,
        workspaces(id, name, description, owner_id, created_at)
      `)
      .eq('user_id', userId);

    if (memberError) {
      console.error("Error fetching member workspaces:", memberError);
      return [];
    }

    const allWorkspaces: any[] = [];

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

    return allWorkspaces;

  } catch (error) {
    console.error("Error in getUserAccessibleWorkspaces:", error);
    return [];
  }
}

/**
 * Check if user is owner of a specific workspace
 */
export async function isWorkspaceOwner(workspaceId: string, userId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    
    if (error || !workspace) {
      console.error("Error checking workspace owner:", error);
      return false;
    }
    
    // Check if user is workspace owner
    const isWorkspaceOwner = workspace.owner_id === userId;
    
    // Check if user has owner role in workspace_members
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();
    
    const hasOwnerRole = member?.role === 'owner';
    
    return isWorkspaceOwner || hasOwnerRole;
  } catch (error) {
    console.error("Error in isWorkspaceOwner:", error);
    return false;
  }
}

/**
 * Security middleware for API routes
 */
export function createWorkspaceSecurityMiddleware() {
  return async function workspaceSecurityMiddleware(
    request: NextRequest,
    handler: (request: NextRequest, workspaceAccess: WorkspaceAccessResult) => Promise<Response>
  ) {
    const accessResult = await validateWorkspaceAccess(request);
    
    if (!accessResult.hasAccess) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: accessResult.error || "Access denied" 
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request, accessResult);
  };
}
