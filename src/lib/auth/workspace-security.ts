import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";
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
    const regularClient = createClient();
    
    // CRITICAL: Use service role client to bypass RLS and prevent infinite recursion
    // Regular client would trigger RLS policies which query workspace_members,
    // causing infinite recursion. Also use service client for owned workspaces
    // to ensure RLS doesn't block owners from seeing their workspaces.
    const serviceClient = createServiceClient();

    if (!serviceClient) {
      // Fallback: try with regular client
      const { data: ownedWorkspaces, error: ownedError } = await regularClient
        .from('workspaces')
        .select('id, name, description, owner_id, created_at, company_name, company_tax_id, company_address, company_phone, company_email')
        .eq('owner_id', userId);

      if (ownedError) {
        console.error("Error fetching owned workspaces (fallback):", ownedError);
        return [];
      }

      const allWorkspaces: any[] = [];
      if (ownedWorkspaces) {
        ownedWorkspaces.forEach(workspace => {
          allWorkspaces.push({
            ...workspace,
            role: 'owner'
          });
        });
      }
      return allWorkspaces;
    }

    // Get owned workspaces - use service client to bypass RLS
    // This ensures owners can always see their workspaces even if RLS has issues
    const { data: ownedWorkspaces, error: ownedError } = await serviceClient
      .from('workspaces')
      .select('id, name, description, owner_id, created_at, company_name, company_tax_id, company_address, company_phone, company_email')
      .eq('owner_id', userId);

    if (ownedError) {
      console.error("Error fetching owned workspaces:", ownedError);
      return [];
    }

    // Get member workspaces - MUST use service role to bypass RLS and prevent infinite recursion
    // Regular client would trigger RLS which queries workspace_members again → recursion
    // If service client is not available, skip member workspaces (fallback)
    let memberWorkspaces: any[] | null = null;
    if (serviceClient) {
      // First get workspace_members to find which workspaces user is member of
      const { data: members, error: memberError } = await serviceClient
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', userId);

      if (memberError) {
        console.error("Failed to fetch workspace_members:", memberError);
      } else if (members && members.length > 0) {
          // Get workspace IDs (exclude owned workspaces to avoid duplicates)
          const ownedWorkspaceIds = new Set(ownedWorkspaces?.map(w => w.id) || []);
          const memberWorkspaceIds = members
            .map(m => m.workspace_id)
            .filter(id => !ownedWorkspaceIds.has(id)); // Remove duplicates with owned workspaces
          
          if (memberWorkspaceIds.length > 0) {
            // Fetch workspace details using service client to bypass RLS
            const { data: memberWorkspaceData, error: workspaceError } = await serviceClient
              .from('workspaces')
              .select('id, name, description, owner_id, created_at, company_name, company_tax_id, company_address, company_phone, company_email')
              .in('id', memberWorkspaceIds);
            
            if (workspaceError) {
            console.error("Failed to fetch member workspace details:", workspaceError);
            } else if (memberWorkspaceData && memberWorkspaceData.length > 0) {
              // Map memberships to workspaces with roles
              memberWorkspaces = memberWorkspaceData.map(workspace => {
                const member = members.find(m => m.workspace_id === workspace.id);
                return {
                  workspace_id: workspace.id,
                  role: member?.role || 'member',
                  workspaces: workspace
                };
              });
          }
        }
      }
    } else {
      console.error("Service role client not available - member workspaces will NOT be fetched!");
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

    // Add member workspaces (only if service client was available)
    if (memberWorkspaces && Array.isArray(memberWorkspaces) && memberWorkspaces.length > 0) {
      memberWorkspaces.forEach((member) => {
        if (member.workspaces) {
          const workspace = Array.isArray(member.workspaces) ? member.workspaces[0] : member.workspaces;
          if (workspace) {
            // Avoid duplicates - check if already in allWorkspaces
            if (!allWorkspaces.find(w => w.id === workspace.id)) {
              allWorkspaces.push({
                ...workspace,
                role: member.role
              });
            }
          }
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
