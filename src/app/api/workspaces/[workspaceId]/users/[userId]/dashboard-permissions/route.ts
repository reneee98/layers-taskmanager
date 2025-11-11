import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Get dashboard permissions for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    const { workspaceId, userId } = await params;
    const supabase = createClient();

    // Check if current user is workspace owner or viewing their own permissions
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Allow owners to view any user's permissions, or users to view their own permissions
    const isOwner = workspace.owner_id === user.id;
    const isViewingOwnPermissions = user.id === userId;
    
    if (!isOwner && !isViewingOwnPermissions) {
      return NextResponse.json(
        { success: false, error: "Nemáte oprávnenie" },
        { status: 403 }
      );
    }

    // Get dashboard permissions
    // Try to fetch, but if table doesn't exist or columns are missing, use defaults
    let permissions = null;
    let permissionsError = null;
    
    try {
      const result = await supabase
        .from("dashboard_permissions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .single();
      
      permissions = result.data;
      permissionsError = result.error;
    } catch (error) {
      // Table might not exist or columns might be missing - use defaults
      console.warn("Dashboard permissions table might not be migrated yet:", error);
      permissionsError = { code: "MIGRATION_PENDING" };
    }

    // If error is not "no rows" (PGRST116), but table exists, log it but still return defaults
    if (permissionsError && permissionsError.code !== "PGRST116" && permissionsError.code !== "MIGRATION_PENDING") {
      console.warn("Error fetching dashboard permissions:", permissionsError);
      // Don't fail - just use defaults
    }

    // Get user's role in workspace to apply role-based dashboard permissions
    let rolePermissions: Record<string, boolean> = {};
    let roleId: string | null = null;
    
    // Check if user is owner
    if (workspace.owner_id === userId) {
      // Owner has all permissions by default
      console.log('[Dashboard Permissions] User is owner, using defaults');
      rolePermissions = {};
    } else {
      // Get user's role from workspace_members or user_roles
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      console.log('[Dashboard Permissions] Member data:', member);

      if (member) {
        // Check for custom role (user_roles table)
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role_id, roles!inner(id, name)')
          .eq('user_id', userId)
          .eq('workspace_id', workspaceId)
          .single();

        console.log('[Dashboard Permissions] User role data:', userRole);

        if (userRole) {
          const role = userRole.roles as any;
          roleId = role.id;
          console.log('[Dashboard Permissions] Found custom role from user_roles:', role.name, roleId);
        } else {
          // Check if member.role is a UUID (custom role ID) or system role
          // System roles are 'owner', 'member', etc.
          const isSystemRole = ['owner', 'member'].includes(member.role);
          console.log('[Dashboard Permissions] Is system role?', isSystemRole, 'Role:', member.role);
          
          if (!isSystemRole) {
            // Try to use member.role as role_id (it might be a UUID)
            const { data: roleCheck } = await supabase
              .from('roles')
              .select('id, name')
              .eq('id', member.role)
              .single();
            
            console.log('[Dashboard Permissions] Role check:', roleCheck);
            
            if (roleCheck) {
              roleId = member.role;
              console.log('[Dashboard Permissions] Found custom role from workspace_members:', roleCheck.name, roleId);
            }
          }
        }

        if (roleId) {
          // Get permissions for this role
          const { data: rolePerms } = await supabase
            .from('role_permissions')
            .select('permissions!inner(name, resource, action)')
            .eq('role_id', roleId);

          console.log('[Dashboard Permissions] Role permissions from DB:', rolePerms?.length || 0, 'permissions');

          if (rolePerms) {
            // Convert role permissions to dashboard permissions format
            const dashboardPermMap: Record<string, string> = {
              'dashboard.show_stats_overview': 'show_stats_overview',
              'dashboard.show_tasks_section': 'show_tasks_section',
              'dashboard.show_activities_section': 'show_activities_section',
              'dashboard.show_calendar_section': 'show_calendar_section',
              'dashboard.show_projects_section': 'show_projects_section',
              'dashboard.show_clients_section': 'show_clients_section',
              'dashboard.show_tab_all_active': 'show_tab_all_active',
              'dashboard.show_tab_today': 'show_tab_today',
              'dashboard.show_tab_sent_to_client': 'show_tab_sent_to_client',
              'dashboard.show_tab_in_progress': 'show_tab_in_progress',
              'dashboard.show_tab_unassigned': 'show_tab_unassigned',
              'dashboard.show_tab_overdue': 'show_tab_overdue',
              'dashboard.show_tab_upcoming': 'show_tab_upcoming',
              'dashboard.show_stat_total_tasks': 'show_stat_total_tasks',
              'dashboard.show_stat_completed_tasks': 'show_stat_completed_tasks',
              'dashboard.show_stat_in_progress_tasks': 'show_stat_in_progress_tasks',
              'dashboard.show_stat_total_hours': 'show_stat_total_hours',
              'dashboard.show_stat_completion_rate': 'show_stat_completion_rate',
              'dashboard.show_stat_todo_tasks': 'show_stat_todo_tasks',
              'dashboard.show_stat_overdue_tasks': 'show_stat_overdue_tasks',
              'dashboard.show_stat_upcoming_tasks': 'show_stat_upcoming_tasks',
              'dashboard.show_quick_task_button': 'show_quick_task_button',
              'dashboard.show_workspace_invitations': 'show_workspace_invitations',
              'dashboard.show_task_title_column': 'show_task_title_column',
              'dashboard.show_task_project_column': 'show_task_project_column',
              'dashboard.show_task_assignees_column': 'show_task_assignees_column',
              'dashboard.show_task_status_column': 'show_task_status_column',
              'dashboard.show_task_priority_column': 'show_task_priority_column',
              'dashboard.show_task_deadline_column': 'show_task_deadline_column',
              'dashboard.show_task_actions_column': 'show_task_actions_column',
              'dashboard.show_view_mode_toggle': 'show_view_mode_toggle',
              'dashboard.show_calendar_view_toggle': 'show_calendar_view_toggle',
              'dashboard.allow_list_view': 'allow_list_view',
              'dashboard.allow_calendar_view': 'allow_calendar_view',
              'dashboard.show_activity_view_all_link': 'show_activity_view_all_link',
              'dashboard.show_activity_count': 'show_activity_count',
              'dashboard.allow_task_edit': 'allow_task_edit',
              'dashboard.allow_task_delete': 'allow_task_delete',
              'dashboard.allow_task_status_change': 'allow_task_status_change',
              'dashboard.allow_task_priority_change': 'allow_task_priority_change',
              'dashboard.allow_task_assignee_change': 'allow_task_assignee_change',
              'dashboard.allow_task_filtering': 'allow_task_filtering',
              'dashboard.allow_task_sorting': 'allow_task_sorting',
            };

            rolePerms.forEach((rp: any) => {
              const perm = rp.permissions;
              console.log('[Dashboard Permissions] Processing permission:', perm?.name, perm?.resource, perm?.action);
              if (perm && dashboardPermMap[perm.name]) {
                rolePermissions[dashboardPermMap[perm.name]] = true;
                console.log('[Dashboard Permissions] Mapped permission:', perm.name, '->', dashboardPermMap[perm.name]);
              } else if (perm) {
                console.log('[Dashboard Permissions] Permission not in dashboard map:', perm.name);
              }
            });
            
            console.log('[Dashboard Permissions] Final role permissions count:', Object.keys(rolePermissions).length);
            console.log('[Dashboard Permissions] Final role permissions keys:', Object.keys(rolePermissions).slice(0, 10));
          }
        }
      }
    }
    
    console.log('[Dashboard Permissions] Role ID:', roleId);
    console.log('[Dashboard Permissions] Has role permissions:', Object.keys(rolePermissions).length > 0);

    // If no permissions exist or permissions exist but missing new fields, merge with defaults
    const defaultPermissions = {
      // Sections
      show_stats_overview: true,
      show_tasks_section: true,
      show_activities_section: true,
      show_calendar_section: true,
      show_projects_section: true,
      show_clients_section: true,
      // Tabs
      show_tab_all_active: true,
      show_tab_today: true,
      show_tab_sent_to_client: true,
      show_tab_in_progress: true,
      show_tab_unassigned: true,
      show_tab_overdue: true,
      show_tab_upcoming: true,
      // Stats
      show_stat_total_tasks: true,
      show_stat_completed_tasks: true,
      show_stat_in_progress_tasks: true,
      show_stat_total_hours: true,
      show_stat_completion_rate: true,
      // Header/Actions
      show_quick_task_button: true,
      show_workspace_invitations: true,
      // Individual Stats
      show_stat_todo_tasks: true,
      show_stat_overdue_tasks: true,
      show_stat_upcoming_tasks: true,
      // Task Table Columns
      show_task_title_column: true,
      show_task_project_column: true,
      show_task_assignees_column: true,
      show_task_status_column: true,
      show_task_priority_column: true,
      show_task_deadline_column: true,
      show_task_actions_column: true,
      // View Modes
      show_view_mode_toggle: true,
      show_calendar_view_toggle: true,
      allow_list_view: true,
      allow_calendar_view: true,
      // Activities
      show_activity_view_all_link: true,
      show_activity_count: true,
      max_activities_displayed: 10,
      // Task Actions
      allow_task_edit: true,
      allow_task_delete: true,
      allow_task_status_change: true,
      allow_task_priority_change: true,
      allow_task_assignee_change: true,
      // Filtering/Sorting
      allow_task_filtering: true,
      allow_task_sorting: true,
    };

    // Apply role permissions: role acts as a whitelist
    // If role has dashboard permissions, only those are true, others are false
    // If role has no dashboard permissions, all are false (role restricts everything)
    const finalPermissions: Record<string, any> = { ...defaultPermissions };
    
    // Check if role has ANY dashboard permissions at all
    const hasAnyDashboardPerms = Object.keys(rolePermissions).length > 0;
    
    if (hasAnyDashboardPerms) {
      // Role has some dashboard permissions - apply whitelist approach
      // Only permissions explicitly in role are true, all others are false
      Object.keys(defaultPermissions).forEach((key) => {
        if (key in rolePermissions) {
          // Role has this permission, set to true
          finalPermissions[key] = true;
        } else {
          // Role doesn't have this permission, set to false
          finalPermissions[key] = false;
        }
      });
    } else if (roleId) {
      // Role has no dashboard permissions at all - check if role has view_dashboard permission
      const { data: rolePermsCheck } = await supabase
        .from('role_permissions')
        .select('permissions!inner(name)')
        .eq('role_id', roleId)
        .eq('permissions.name', 'pages.view_dashboard')
        .limit(1);
      
      const hasViewDashboard = rolePermsCheck && rolePermsCheck.length > 0;
      
      if (hasViewDashboard) {
        // Role has view_dashboard but no other dashboard permissions - restrict all dashboard features
        Object.keys(defaultPermissions).forEach((key) => {
          finalPermissions[key] = false;
        });
      } else {
        // Role doesn't have view_dashboard permission - restrict all dashboard permissions
        Object.keys(defaultPermissions).forEach((key) => {
          finalPermissions[key] = false;
        });
      }
    }
    // If roleId is null (system role like 'owner' or 'member'), keep defaults (all true)

    console.log('[Dashboard Permissions] Final permissions before return:', {
      hasRolePerms: Object.keys(rolePermissions).length > 0,
      hasUserPerms: !!permissions,
      sampleFinalPerms: {
        show_tasks_section: finalPermissions.show_tasks_section,
        show_activities_section: finalPermissions.show_activities_section,
        show_tab_in_progress: finalPermissions.show_tab_in_progress,
      }
    });

    // If role has permissions, use them (role permissions take precedence)
    // User-specific permissions are only used if role has no dashboard permissions
    if (Object.keys(rolePermissions).length > 0 || (roleId && !permissions)) {
      // Role has permissions - use role permissions, ignore user-specific
      console.log('[Dashboard Permissions] Using role permissions, ignoring user-specific');
      return NextResponse.json({
        success: true,
        data: finalPermissions,
      });
    }

    // If no role permissions and user has specific permissions, use those
    if (permissions) {
      console.log('[Dashboard Permissions] Using user-specific permissions (no role permissions)');
      return NextResponse.json({
        success: true,
        data: {
          ...defaultPermissions,
          ...permissions, // User-specific permissions override defaults
        },
      });
    }

    // No role permissions and no user-specific permissions - use defaults
    console.log('[Dashboard Permissions] Using defaults (no role or user permissions)');
    return NextResponse.json({
      success: true,
      data: finalPermissions,
    });
  } catch (error) {
    console.error("Error fetching dashboard permissions:", error);
    // Always return defaults instead of failing - don't block the UI
    return NextResponse.json({
      success: true,
      data: {
        // Sections
        show_stats_overview: true,
        show_tasks_section: true,
        show_activities_section: true,
        show_calendar_section: true,
        show_projects_section: true,
        show_clients_section: true,
        // Tabs
        show_tab_all_active: true,
        show_tab_today: true,
        show_tab_sent_to_client: true,
        show_tab_in_progress: true,
        show_tab_unassigned: true,
        show_tab_overdue: true,
        show_tab_upcoming: true,
        // Stats
        show_stat_total_tasks: true,
        show_stat_completed_tasks: true,
        show_stat_in_progress_tasks: true,
        show_stat_total_hours: true,
        show_stat_completion_rate: true,
        // Header/Actions
        show_quick_task_button: true,
        show_workspace_invitations: true,
        // Individual Stats
        show_stat_todo_tasks: true,
        show_stat_overdue_tasks: true,
        show_stat_upcoming_tasks: true,
        // Task Table Columns
        show_task_title_column: true,
        show_task_project_column: true,
        show_task_assignees_column: true,
        show_task_status_column: true,
        show_task_priority_column: true,
        show_task_deadline_column: true,
        show_task_actions_column: true,
        // View Modes
        show_view_mode_toggle: true,
        show_calendar_view_toggle: true,
        allow_list_view: true,
        allow_calendar_view: true,
        // Activities
        show_activity_view_all_link: true,
        show_activity_count: true,
        max_activities_displayed: 10,
        // Task Actions
        allow_task_edit: true,
        allow_task_delete: true,
        allow_task_status_change: true,
        allow_task_priority_change: true,
        allow_task_assignee_change: true,
        // Filtering/Sorting
        allow_task_filtering: true,
        allow_task_sorting: true,
      },
    });
  }
}

// POST/PUT - Update dashboard permissions for a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    const { workspaceId, userId } = await params;
    const body = await request.json();
    const supabase = createClient();

    // Check if current user is workspace owner
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Only owners can update dashboard permissions
    if (workspace.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Nemáte oprávnenie" },
        { status: 403 }
      );
    }

    // Verify that target user is a member of the workspace
    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    // Also check if user is the owner
    const isOwner = workspace.owner_id === userId;

    if (memberError && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Používateľ nie je členom workspace" },
        { status: 404 }
      );
    }

    // Prepare permissions data
    const permissionsData = {
      workspace_id: workspaceId,
      user_id: userId,
      // Sections
      show_stats_overview: body.show_stats_overview ?? true,
      show_tasks_section: body.show_tasks_section ?? true,
      show_activities_section: body.show_activities_section ?? true,
      show_calendar_section: body.show_calendar_section ?? true,
      show_projects_section: body.show_projects_section ?? true,
      show_clients_section: body.show_clients_section ?? true,
      // Tabs
      show_tab_all_active: body.show_tab_all_active ?? true,
      show_tab_today: body.show_tab_today ?? true,
      show_tab_sent_to_client: body.show_tab_sent_to_client ?? true,
      show_tab_in_progress: body.show_tab_in_progress ?? true,
      show_tab_unassigned: body.show_tab_unassigned ?? true,
      show_tab_overdue: body.show_tab_overdue ?? true,
      show_tab_upcoming: body.show_tab_upcoming ?? true,
      // Stats
      show_stat_total_tasks: body.show_stat_total_tasks ?? true,
      show_stat_completed_tasks: body.show_stat_completed_tasks ?? true,
      show_stat_in_progress_tasks: body.show_stat_in_progress_tasks ?? true,
      show_stat_total_hours: body.show_stat_total_hours ?? true,
      show_stat_completion_rate: body.show_stat_completion_rate ?? true,
      // Header/Actions
      show_quick_task_button: body.show_quick_task_button ?? true,
      show_workspace_invitations: body.show_workspace_invitations ?? true,
      // Individual Stats
      show_stat_todo_tasks: body.show_stat_todo_tasks ?? true,
      show_stat_overdue_tasks: body.show_stat_overdue_tasks ?? true,
      show_stat_upcoming_tasks: body.show_stat_upcoming_tasks ?? true,
      // Task Table Columns
      show_task_title_column: body.show_task_title_column ?? true,
      show_task_project_column: body.show_task_project_column ?? true,
      show_task_assignees_column: body.show_task_assignees_column ?? true,
      show_task_status_column: body.show_task_status_column ?? true,
      show_task_priority_column: body.show_task_priority_column ?? true,
      show_task_deadline_column: body.show_task_deadline_column ?? true,
      show_task_actions_column: body.show_task_actions_column ?? true,
      // View Modes
      show_view_mode_toggle: body.show_view_mode_toggle ?? true,
      show_calendar_view_toggle: body.show_calendar_view_toggle ?? true,
      allow_list_view: body.allow_list_view ?? true,
      allow_calendar_view: body.allow_calendar_view ?? true,
      // Activities
      show_activity_view_all_link: body.show_activity_view_all_link ?? true,
      show_activity_count: body.show_activity_count ?? true,
      max_activities_displayed: body.max_activities_displayed ?? 10,
      // Task Actions
      allow_task_edit: body.allow_task_edit ?? true,
      allow_task_delete: body.allow_task_delete ?? true,
      allow_task_status_change: body.allow_task_status_change ?? true,
      allow_task_priority_change: body.allow_task_priority_change ?? true,
      allow_task_assignee_change: body.allow_task_assignee_change ?? true,
      // Filtering/Sorting
      allow_task_filtering: body.allow_task_filtering ?? true,
      allow_task_sorting: body.allow_task_sorting ?? true,
      custom_settings: body.custom_settings || {},
    };

    // Upsert permissions (insert or update)
    const { data: permissions, error: upsertError } = await supabase
      .from("dashboard_permissions")
      .upsert(permissionsData, {
        onConflict: "workspace_id,user_id",
      })
      .select()
      .single();

    if (upsertError) {
      console.error("Error upserting dashboard permissions:", upsertError);
      return NextResponse.json(
        { success: false, error: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: permissions,
      message: "Dashboard permissions updated successfully",
    });
  } catch (error) {
    console.error("Error updating dashboard permissions:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Alias for POST
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  return POST(request, { params });
}

