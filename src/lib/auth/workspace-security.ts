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
    console.log(`=== DEBUG getUserAccessibleWorkspaces START ===`);
    console.log(`User ID: ${userId}`);
    
    const regularClient = createClient();
    
    // CRITICAL: Use service role client to bypass RLS and prevent infinite recursion
    // Regular client would trigger RLS policies which query workspace_members,
    // causing infinite recursion. Also use service client for owned workspaces
    // to ensure RLS doesn't block owners from seeing their workspaces.
    const serviceClient = createServiceClient();

    console.log(`Service client available: ${!!serviceClient}`);

    if (!serviceClient) {
      console.warn("Service role client not available - using regular client with RLS");
      // Fallback: try with regular client
      console.log(`DEBUG: Attempting to fetch owned workspaces with regular client for userId: ${userId}`);
      const { data: ownedWorkspaces, error: ownedError } = await regularClient
        .from('workspaces')
        .select('id, name, description, owner_id, created_at')
        .eq('owner_id', userId);

      console.log(`DEBUG: Regular client result - workspaces: ${ownedWorkspaces?.length || 0}, error: ${ownedError?.message || 'none'}`);
      if (ownedError) {
        console.error("Error fetching owned workspaces (fallback):", ownedError);
        return [];
      }

      const allWorkspaces: any[] = [];
      if (ownedWorkspaces) {
        ownedWorkspaces.forEach(workspace => {
          console.log(`DEBUG: Adding owned workspace: ${workspace.name} (${workspace.id})`);
          allWorkspaces.push({
            ...workspace,
            role: 'owner'
          });
        });
      }
      console.log(`=== DEBUG getUserAccessibleWorkspaces END (fallback) ===`);
      return allWorkspaces;
    }

    // Get owned workspaces - use service client to bypass RLS
    // This ensures owners can always see their workspaces even if RLS has issues
    console.log(`DEBUG: Attempting to fetch owned workspaces with service client for userId: ${userId}`);
    const { data: ownedWorkspaces, error: ownedError } = await serviceClient
      .from('workspaces')
      .select('id, name, description, owner_id, created_at')
      .eq('owner_id', userId);

    console.log(`DEBUG: Service client owned workspaces result - count: ${ownedWorkspaces?.length || 0}, error: ${ownedError?.message || 'none'}`);
    if (ownedWorkspaces && ownedWorkspaces.length > 0) {
      console.log(`DEBUG: Owned workspaces details:`, ownedWorkspaces.map(w => ({ id: w.id, name: w.name, owner_id: w.owner_id })));
    }

    if (ownedError) {
      console.error("Error fetching owned workspaces:", ownedError);
      return [];
    }

    // Get member workspaces - MUST use service role to bypass RLS and prevent infinite recursion
    // Regular client would trigger RLS which queries workspace_members again → recursion
    // If service client is not available, skip member workspaces (fallback)
    let memberWorkspaces: any[] | null = null;
    if (serviceClient) {
      console.log(`DEBUG: Service client available, fetching member workspaces for user ${userId}`);
      // First get workspace_members to find which workspaces user is member of
      const { data: members, error: memberError } = await serviceClient
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', userId);

      if (memberError) {
        console.error("ERROR: Failed to fetch workspace_members:", memberError);
        console.error("ERROR Details:", JSON.stringify(memberError, null, 2));
      } else {
        console.log(`DEBUG: workspace_members query result:`, { 
          count: members?.length || 0, 
          members: members || null,
          error: memberError || null
        });
        
        if (members && members.length > 0) {
          console.log(`DEBUG: Found ${members.length} workspace memberships for user ${userId}`);
          console.log(`DEBUG: Member workspace IDs (raw):`, members.map(m => m.workspace_id));
          console.log(`DEBUG: Member roles:`, members.map(m => ({ workspace_id: m.workspace_id, role: m.role })));
          
          // Get workspace IDs (exclude owned workspaces to avoid duplicates)
          const ownedWorkspaceIds = new Set(ownedWorkspaces?.map(w => w.id) || []);
          const memberWorkspaceIds = members
            .map(m => m.workspace_id)
            .filter(id => !ownedWorkspaceIds.has(id)); // Remove duplicates with owned workspaces
          
          console.log(`DEBUG: Owned workspace IDs:`, Array.from(ownedWorkspaceIds));
          console.log(`DEBUG: Member workspace IDs (after filtering owned):`, memberWorkspaceIds);
          console.log(`DEBUG: Layers workspace ID: 6dd7d31a-3d36-4d92-a8eb-7146703a00b0`);
          console.log(`DEBUG: Is Layers in memberWorkspaceIds?`, memberWorkspaceIds.includes('6dd7d31a-3d36-4d92-a8eb-7146703a00b0'));
          
          if (memberWorkspaceIds.length > 0) {
            console.log(`DEBUG: Fetching details for ${memberWorkspaceIds.length} member workspaces...`);
            // Fetch workspace details using service client to bypass RLS
            const { data: memberWorkspaceData, error: workspaceError } = await serviceClient
              .from('workspaces')
              .select('id, name, description, owner_id, created_at')
              .in('id', memberWorkspaceIds);
            
            console.log(`DEBUG: Workspace details fetch result:`, {
              count: memberWorkspaceData?.length || 0,
              data: memberWorkspaceData || null,
              error: workspaceError || null
            });
            
            if (workspaceError) {
              console.error("ERROR: Failed to fetch member workspace details:", workspaceError);
              console.error("ERROR Details:", JSON.stringify(workspaceError, null, 2));
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
              console.log(`DEBUG: Successfully mapped ${memberWorkspaces.length} member workspaces`);
            } else {
              console.warn(`DEBUG: No workspace data returned for ${memberWorkspaceIds.length} workspace IDs`);
            }
          } else {
            console.warn(`DEBUG: No member workspace IDs after filtering (all are owned or empty)`);
          }
        } else {
          console.warn(`DEBUG: No workspace memberships found for user ${userId}`);
        }
      }
    } else {
      console.error("CRITICAL: Service role client not available - member workspaces will NOT be fetched!");
      console.error("This means users who are members (not owners) will not see their workspaces!");
    }

    const allWorkspaces: any[] = [];

    // Add owned workspaces
    if (ownedWorkspaces) {
      console.log(`DEBUG: User ${userId} owns ${ownedWorkspaces.length} workspace(s)`);
      ownedWorkspaces.forEach(workspace => {
        allWorkspaces.push({
          ...workspace,
          role: 'owner'
        });
      });
    }

    // Add member workspaces (only if service client was available)
    console.log(`DEBUG: memberWorkspaces value:`, memberWorkspaces);
    console.log(`DEBUG: memberWorkspaces is array:`, Array.isArray(memberWorkspaces));
    console.log(`DEBUG: memberWorkspaces length:`, memberWorkspaces?.length || 0);
    
    if (memberWorkspaces && Array.isArray(memberWorkspaces) && memberWorkspaces.length > 0) {
      console.log(`DEBUG: User ${userId} is member of ${memberWorkspaces.length} workspace(s)`);
      memberWorkspaces.forEach((member, index) => {
        console.log(`DEBUG: Processing member workspace ${index}:`, member);
        if (member.workspaces) {
          const workspace = Array.isArray(member.workspaces) ? member.workspaces[0] : member.workspaces;
          if (workspace) {
            console.log(`DEBUG: Adding member workspace: ${workspace.name} (${workspace.id}) with role: ${member.role}`);
            // Avoid duplicates - check if already in allWorkspaces
            if (!allWorkspaces.find(w => w.id === workspace.id)) {
              allWorkspaces.push({
                ...workspace,
                role: member.role
              });
              console.log(`DEBUG: ✓ Added workspace ${workspace.name} to allWorkspaces`);
            } else {
              console.log(`DEBUG: ⚠ Skipped workspace ${workspace.name} (duplicate)`);
            }
          } else {
            console.warn(`DEBUG: ⚠ Member workspace ${index} has no workspace data`);
          }
        } else {
          console.warn(`DEBUG: ⚠ Member ${index} has no workspaces property`);
        }
      });
    } else {
      console.warn(`DEBUG: No member workspaces to add (memberWorkspaces is ${memberWorkspaces === null ? 'null' : memberWorkspaces === undefined ? 'undefined' : 'empty'})`);
    }

    console.log(`DEBUG: Total workspaces for user ${userId}: ${allWorkspaces.length}`);
    console.log(`DEBUG: Workspace names:`, allWorkspaces.map(w => w.name));
    console.log(`=== DEBUG getUserAccessibleWorkspaces END ===`);
    return allWorkspaces;

  } catch (error) {
    console.error("Error in getUserAccessibleWorkspaces:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
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
