import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { getUserAccessibleWorkspaces } from "@/lib/auth/workspace-security";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

// Common permissions used across the app
const COMMON_PERMISSIONS = [
  { resource: 'pages', action: 'view_dashboard' },
  { resource: 'pages', action: 'view_projects' },
  { resource: 'pages', action: 'view_clients' },
  { resource: 'pages', action: 'view_tasks' },
  { resource: 'pages', action: 'view_invoices' },
  { resource: 'pages', action: 'view_settings' },
  { resource: 'pages', action: 'view_workspace_users' },
  { resource: 'pages', action: 'view_admin_roles' },
  { resource: 'pages', action: 'view_admin_bugs' },
  { resource: 'tasks', action: 'read' },
  { resource: 'tasks', action: 'view' },
  { resource: 'projects', action: 'read' },
  { resource: 'projects', action: 'view' },
];

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createClient();
    
    // Get workspaces
    const allWorkspaces = await getUserAccessibleWorkspaces(user.id);
    
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
        console.error("Error creating workspace:", createError);
        return NextResponse.json({ success: false, error: "Failed to create workspace" }, { status: 500 });
      }

      // Automaticky pridaj ownera do workspace_members tabuľky
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: newWorkspace.id,
          user_id: user.id,
          role: 'owner',
          created_at: newWorkspace.created_at
        });

      if (memberError) {
        console.error("Error adding owner to workspace_members:", memberError);
      }

      // Automaticky vytvor osobný projekt "Osobné úlohy"
      const personalProjectCode = `PERSONAL-${newWorkspace.id.substring(0, 8).toUpperCase()}`;
      const { data: personalProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          workspace_id: newWorkspace.id,
          name: 'Osobné úlohy',
          code: personalProjectCode,
          description: 'Projekt pre osobné úlohy bez klienta',
          status: 'active',
          client_id: null,
          created_by: user.id
        })
        .select('id, name, code')
        .single();

      if (projectError) {
        console.error("Error creating personal project:", projectError);
      }
      
      allWorkspaces.push({
        ...newWorkspace,
        role: 'owner'
      });
    }
    
    // Get current workspace ID from cookie or use first workspace
    const currentWorkspaceId = request.cookies.get('currentWorkspaceId')?.value || 
                               allWorkspaces[0]?.id;
    
    const currentWorkspace = allWorkspaces.find(w => w.id === currentWorkspaceId) || allWorkspaces[0];
    
    // Get workspace role for current workspace
    let workspaceRole: { role: string; role_id?: string } | null = null;
    
    if (currentWorkspace) {
      // Check if user is owner
      if (currentWorkspace.owner_id === user.id) {
        workspaceRole = { role: 'owner' };
      } else {
        // Fetch member role
        const { data: member } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', currentWorkspace.id)
          .eq('user_id', user.id)
          .single();

        if (member) {
          // Check for custom role
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('role_id, roles!inner(name)')
            .eq('user_id', user.id)
            .eq('workspace_id', currentWorkspace.id)
            .single();

          if (userRole) {
            const role = userRole.roles as any;
            workspaceRole = {
              role: role.name,
              role_id: userRole.role_id
            };
          } else {
            workspaceRole = { role: member.role };
          }
        }
      }
    }
    
    // Get permissions for current workspace in parallel
    const permissionChecks = COMMON_PERMISSIONS.map(perm => 
      hasPermission(user.id, perm.resource, perm.action, currentWorkspace?.id)
    );
    
    const permissionResults = await Promise.all(permissionChecks);
    
    // Build permission map
    const permissions: Record<string, boolean> = {};
    COMMON_PERMISSIONS.forEach((perm, index) => {
      const key = `${perm.resource}.${perm.action}`;
      permissions[key] = permissionResults[index];
    });
    
    return NextResponse.json({
      success: true,
      data: {
        workspaces: allWorkspaces,
        currentWorkspace: currentWorkspace || null,
        workspaceRole,
        permissions,
      }
    });
  } catch (error) {
    console.error("Error in workspaces init GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}







