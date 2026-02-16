import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteParams = {
  workspaceId: string;
  userId: string;
};

type DashboardPermissions = {
  show_stats_overview: boolean;
  show_tasks_section: boolean;
  show_activities_section: boolean;
  show_calendar_section: boolean;
  show_projects_section: boolean;
  show_clients_section: boolean;
  show_tab_all_active: boolean;
  show_tab_today: boolean;
  show_tab_sent_to_client: boolean;
  show_tab_in_progress: boolean;
  show_tab_unassigned: boolean;
  show_tab_overdue: boolean;
  show_tab_upcoming: boolean;
  show_stat_total_tasks: boolean;
  show_stat_completed_tasks: boolean;
  show_stat_in_progress_tasks: boolean;
  show_stat_total_hours: boolean;
  show_stat_completion_rate: boolean;
  show_quick_task_button: boolean;
  show_workspace_invitations: boolean;
  show_stat_todo_tasks: boolean;
  show_stat_overdue_tasks: boolean;
  show_stat_upcoming_tasks: boolean;
  show_task_title_column: boolean;
  show_task_project_column: boolean;
  show_task_assignees_column: boolean;
  show_task_status_column: boolean;
  show_task_priority_column: boolean;
  show_task_deadline_column: boolean;
  show_task_actions_column: boolean;
  show_view_mode_toggle: boolean;
  show_calendar_view_toggle: boolean;
  allow_list_view: boolean;
  allow_calendar_view: boolean;
  show_activity_view_all_link: boolean;
  show_activity_count: boolean;
  max_activities_displayed: number;
  allow_task_edit: boolean;
  allow_task_delete: boolean;
  allow_task_status_change: boolean;
  allow_task_priority_change: boolean;
  allow_task_assignee_change: boolean;
  allow_task_filtering: boolean;
  allow_task_sorting: boolean;
};

const DEFAULT_DASHBOARD_PERMISSIONS: DashboardPermissions = {
  show_stats_overview: true,
  show_tasks_section: true,
  show_activities_section: true,
  show_calendar_section: true,
  show_projects_section: true,
  show_clients_section: true,
  show_tab_all_active: true,
  show_tab_today: true,
  show_tab_sent_to_client: true,
  show_tab_in_progress: true,
  show_tab_unassigned: true,
  show_tab_overdue: true,
  show_tab_upcoming: true,
  show_stat_total_tasks: true,
  show_stat_completed_tasks: true,
  show_stat_in_progress_tasks: true,
  show_stat_total_hours: true,
  show_stat_completion_rate: true,
  show_quick_task_button: true,
  show_workspace_invitations: true,
  show_stat_todo_tasks: true,
  show_stat_overdue_tasks: true,
  show_stat_upcoming_tasks: true,
  show_task_title_column: true,
  show_task_project_column: true,
  show_task_assignees_column: true,
  show_task_status_column: true,
  show_task_priority_column: true,
  show_task_deadline_column: true,
  show_task_actions_column: true,
  show_view_mode_toggle: true,
  show_calendar_view_toggle: true,
  allow_list_view: true,
  allow_calendar_view: true,
  show_activity_view_all_link: true,
  show_activity_count: true,
  max_activities_displayed: 10,
  allow_task_edit: true,
  allow_task_delete: true,
  allow_task_status_change: true,
  allow_task_priority_change: true,
  allow_task_assignee_change: true,
  allow_task_filtering: true,
  allow_task_sorting: true,
};

const BOOLEAN_PERMISSION_KEYS: Array<Exclude<keyof DashboardPermissions, "max_activities_displayed">> = [
  "show_stats_overview",
  "show_tasks_section",
  "show_activities_section",
  "show_calendar_section",
  "show_projects_section",
  "show_clients_section",
  "show_tab_all_active",
  "show_tab_today",
  "show_tab_sent_to_client",
  "show_tab_in_progress",
  "show_tab_unassigned",
  "show_tab_overdue",
  "show_tab_upcoming",
  "show_stat_total_tasks",
  "show_stat_completed_tasks",
  "show_stat_in_progress_tasks",
  "show_stat_total_hours",
  "show_stat_completion_rate",
  "show_quick_task_button",
  "show_workspace_invitations",
  "show_stat_todo_tasks",
  "show_stat_overdue_tasks",
  "show_stat_upcoming_tasks",
  "show_task_title_column",
  "show_task_project_column",
  "show_task_assignees_column",
  "show_task_status_column",
  "show_task_priority_column",
  "show_task_deadline_column",
  "show_task_actions_column",
  "show_view_mode_toggle",
  "show_calendar_view_toggle",
  "allow_list_view",
  "allow_calendar_view",
  "show_activity_view_all_link",
  "show_activity_count",
  "allow_task_edit",
  "allow_task_delete",
  "allow_task_status_change",
  "allow_task_priority_change",
  "allow_task_assignee_change",
  "allow_task_filtering",
  "allow_task_sorting",
];

const LEGACY_COLUMN_KEYS: Array<
  | "show_stats_overview"
  | "show_tasks_section"
  | "show_activities_section"
  | "show_calendar_section"
  | "show_projects_section"
  | "show_clients_section"
  | "show_tab_all_active"
  | "show_tab_today"
  | "show_tab_sent_to_client"
  | "show_tab_in_progress"
  | "show_tab_unassigned"
  | "show_tab_overdue"
  | "show_tab_upcoming"
  | "show_stat_total_tasks"
  | "show_stat_completed_tasks"
  | "show_stat_in_progress_tasks"
  | "show_stat_total_hours"
  | "show_stat_completion_rate"
> = [
  "show_stats_overview",
  "show_tasks_section",
  "show_activities_section",
  "show_calendar_section",
  "show_projects_section",
  "show_clients_section",
  "show_tab_all_active",
  "show_tab_today",
  "show_tab_sent_to_client",
  "show_tab_in_progress",
  "show_tab_unassigned",
  "show_tab_overdue",
  "show_tab_upcoming",
  "show_stat_total_tasks",
  "show_stat_completed_tasks",
  "show_stat_in_progress_tasks",
  "show_stat_total_hours",
  "show_stat_completion_rate",
];

const DASHBOARD_ROLE_PERMISSION_MAP: Record<
  string,
  Exclude<keyof DashboardPermissions, "max_activities_displayed">
> = {
  "dashboard.show_stats_overview": "show_stats_overview",
  "dashboard.show_tasks_section": "show_tasks_section",
  "dashboard.show_activities_section": "show_activities_section",
  "dashboard.show_calendar_section": "show_calendar_section",
  "dashboard.show_projects_section": "show_projects_section",
  "dashboard.show_clients_section": "show_clients_section",
  "dashboard.show_tab_all_active": "show_tab_all_active",
  "dashboard.show_tab_today": "show_tab_today",
  "dashboard.show_tab_sent_to_client": "show_tab_sent_to_client",
  "dashboard.show_tab_in_progress": "show_tab_in_progress",
  "dashboard.show_tab_unassigned": "show_tab_unassigned",
  "dashboard.show_tab_overdue": "show_tab_overdue",
  "dashboard.show_tab_upcoming": "show_tab_upcoming",
  "dashboard.show_stat_total_tasks": "show_stat_total_tasks",
  "dashboard.show_stat_completed_tasks": "show_stat_completed_tasks",
  "dashboard.show_stat_in_progress_tasks": "show_stat_in_progress_tasks",
  "dashboard.show_stat_total_hours": "show_stat_total_hours",
  "dashboard.show_stat_completion_rate": "show_stat_completion_rate",
  "dashboard.show_stat_todo_tasks": "show_stat_todo_tasks",
  "dashboard.show_stat_overdue_tasks": "show_stat_overdue_tasks",
  "dashboard.show_stat_upcoming_tasks": "show_stat_upcoming_tasks",
  "dashboard.show_quick_task_button": "show_quick_task_button",
  "dashboard.show_workspace_invitations": "show_workspace_invitations",
  "dashboard.show_task_title_column": "show_task_title_column",
  "dashboard.show_task_project_column": "show_task_project_column",
  "dashboard.show_task_assignees_column": "show_task_assignees_column",
  "dashboard.show_task_status_column": "show_task_status_column",
  "dashboard.show_task_priority_column": "show_task_priority_column",
  "dashboard.show_task_deadline_column": "show_task_deadline_column",
  "dashboard.show_task_actions_column": "show_task_actions_column",
  "dashboard.show_view_mode_toggle": "show_view_mode_toggle",
  "dashboard.show_calendar_view_toggle": "show_calendar_view_toggle",
  "dashboard.allow_list_view": "allow_list_view",
  "dashboard.allow_calendar_view": "allow_calendar_view",
  "dashboard.show_activity_view_all_link": "show_activity_view_all_link",
  "dashboard.show_activity_count": "show_activity_count",
  "dashboard.allow_task_edit": "allow_task_edit",
  "dashboard.allow_task_delete": "allow_task_delete",
  "dashboard.allow_task_status_change": "allow_task_status_change",
  "dashboard.allow_task_priority_change": "allow_task_priority_change",
  "dashboard.allow_task_assignee_change": "allow_task_assignee_change",
  "dashboard.allow_task_filtering": "allow_task_filtering",
  "dashboard.allow_task_sorting": "allow_task_sorting",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSupabaseErrorCode(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }

  const errorCode = error.code;
  return typeof errorCode === "string" ? errorCode : null;
}

function isSchemaMismatchError(error: unknown): boolean {
  const code = getSupabaseErrorCode(error);
  if (code === "PGRST204" || code === "42703") {
    return true;
  }

  if (!isRecord(error)) {
    return false;
  }

  const message = [error.message, error.details, error.hint]
    .filter((part) => typeof part === "string")
    .join(" ")
    .toLowerCase();

  return message.includes("column") || message.includes("schema cache");
}

function normalizeMaxActivities(value: unknown): number | undefined {
  const raw =
    typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : value;

  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }

  const rounded = Math.round(raw);
  if (rounded < 1) return 1;
  if (rounded > 100) return 100;
  return rounded;
}

function applyPermissionValues(
  source: Record<string, unknown>,
  target: Partial<DashboardPermissions>
) {
  for (const key of BOOLEAN_PERMISSION_KEYS) {
    const value = source[key];
    if (typeof value === "boolean") {
      target[key] = value;
    }
  }

  const maxActivities = normalizeMaxActivities(source.max_activities_displayed);
  if (maxActivities !== undefined) {
    target.max_activities_displayed = maxActivities;
  }
}

function sanitizePermissionsInput(input: unknown): DashboardPermissions {
  const overrides: Partial<DashboardPermissions> = {};

  if (isRecord(input)) {
    if (isRecord(input.custom_settings)) {
      applyPermissionValues(input.custom_settings, overrides);
    }
    applyPermissionValues(input, overrides);
  }

  return {
    ...DEFAULT_DASHBOARD_PERMISSIONS,
    ...overrides,
  };
}

function extractPermissionOverrides(input: unknown): Partial<DashboardPermissions> {
  const overrides: Partial<DashboardPermissions> = {};

  if (!isRecord(input)) {
    return overrides;
  }

  applyPermissionValues(input, overrides);

  if (isRecord(input.custom_settings)) {
    applyPermissionValues(input.custom_settings, overrides);
  }

  return overrides;
}

function createLegacyPayload(
  workspaceId: string,
  userId: string,
  permissions: DashboardPermissions,
  rawCustomSettings: unknown
) {
  const legacyPayload: Record<string, unknown> = {
    workspace_id: workspaceId,
    user_id: userId,
  };

  LEGACY_COLUMN_KEYS.forEach((key) => {
    legacyPayload[key] = permissions[key];
  });

  const customSettings = isRecord(rawCustomSettings) ? rawCustomSettings : {};
  legacyPayload.custom_settings = {
    ...customSettings,
    ...permissions,
  };

  return legacyPayload;
}

async function resolveRolePermissions(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
  workspaceOwnerId: string
): Promise<{ roleId: string | null; roleFlags: Partial<Record<Exclude<keyof DashboardPermissions, "max_activities_displayed">, boolean>> }> {
  if (workspaceOwnerId === userId) {
    return { roleId: null, roleFlags: {} };
  }

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) {
    return { roleId: null, roleFlags: {} };
  }

  let roleId: string | null = null;

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role_id, roles!inner(id, name)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (userRole) {
    const roleEntity = Array.isArray(userRole.roles)
      ? userRole.roles[0]
      : userRole.roles;

    if (roleEntity && typeof roleEntity.id === "string") {
      roleId = roleEntity.id;
    }
  }

  if (!roleId && typeof member.role === "string" && !["owner", "member"].includes(member.role)) {
    const { data: roleCheck } = await supabase
      .from("roles")
      .select("id")
      .eq("id", member.role)
      .maybeSingle();

    if (roleCheck?.id) {
      roleId = roleCheck.id;
    }
  }

  if (!roleId) {
    return { roleId: null, roleFlags: {} };
  }

  const { data: rolePerms } = await supabase
    .from("role_permissions")
    .select("permissions!inner(name)")
    .eq("role_id", roleId);

  const roleFlags: Partial<Record<Exclude<keyof DashboardPermissions, "max_activities_displayed">, boolean>> = {};

  (rolePerms || []).forEach((entry: any) => {
    const permissionName =
      Array.isArray(entry.permissions)
        ? entry.permissions[0]?.name
        : entry.permissions?.name;

    if (typeof permissionName !== "string") {
      return;
    }

    const mappedKey = DASHBOARD_ROLE_PERMISSION_MAP[permissionName];
    if (mappedKey) {
      roleFlags[mappedKey] = true;
    }
  });

  return { roleId, roleFlags };
}

async function createRoleBaseline(
  _supabase: ReturnType<typeof createClient>,
  roleId: string | null,
  roleFlags: Partial<Record<Exclude<keyof DashboardPermissions, "max_activities_displayed">, boolean>>
): Promise<DashboardPermissions> {
  const baseline: DashboardPermissions = { ...DEFAULT_DASHBOARD_PERMISSIONS };

  const hasRoleFlags = Object.keys(roleFlags).length > 0;

  if (hasRoleFlags) {
    for (const key of BOOLEAN_PERMISSION_KEYS) {
      baseline[key] = Boolean(roleFlags[key]);
    }
    return baseline;
  }

  if (!roleId) {
    return baseline;
  }

  // Custom role without explicit dashboard permissions starts with restricted dashboard.
  for (const key of BOOLEAN_PERMISSION_KEYS) {
    baseline[key] = false;
  }

  return baseline;
}

// GET - Get dashboard permissions for a user
export async function GET(
  _request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    const { workspaceId, userId } = params;
    const supabase = createClient();

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

    const isOwner = workspace.owner_id === user.id;
    const isViewingOwnPermissions = user.id === userId;

    if (!isOwner && !isViewingOwnPermissions) {
      return NextResponse.json(
        { success: false, error: "Nemáte oprávnenie" },
        { status: 403 }
      );
    }

    let storedPermissions: unknown = null;

    try {
      const { data, error } = await supabase
        .from("dashboard_permissions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error && getSupabaseErrorCode(error) !== "PGRST116") {
        console.warn("Error fetching dashboard permissions:", error);
      }

      storedPermissions = data;
    } catch (error) {
      console.warn("Dashboard permissions table/schema not fully available:", error);
      storedPermissions = null;
    }

    const { roleId, roleFlags } = await resolveRolePermissions(
      supabase,
      workspaceId,
      userId,
      workspace.owner_id
    );

    const roleBaseline = await createRoleBaseline(supabase, roleId, roleFlags);
    const manualOverrides = extractPermissionOverrides(storedPermissions);

    return NextResponse.json({
      success: true,
      data: {
        ...roleBaseline,
        ...manualOverrides,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard permissions:", error);
    return NextResponse.json({
      success: true,
      data: DEFAULT_DASHBOARD_PERMISSIONS,
    });
  }
}

// POST/PUT - Update dashboard permissions for a user
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    const { workspaceId, userId } = params;
    const body = await request.json();
    const supabase = createClient();

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

    if (workspace.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Nemáte oprávnenie" },
        { status: 403 }
      );
    }

    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    const isWorkspaceOwner = workspace.owner_id === userId;

    if (!member && !isWorkspaceOwner) {
      if (memberError && getSupabaseErrorCode(memberError) !== "PGRST116") {
        console.error("Error verifying workspace member:", memberError);
      }

      return NextResponse.json(
        { success: false, error: "Používateľ nie je členom workspace" },
        { status: 404 }
      );
    }

    const normalizedPermissions = sanitizePermissionsInput(body);
    const customSettings = isRecord(body?.custom_settings) ? body.custom_settings : {};

    const fullPayload: Record<string, unknown> = {
      workspace_id: workspaceId,
      user_id: userId,
      ...normalizedPermissions,
      custom_settings: customSettings,
    };

    let upsertResult = await supabase
      .from("dashboard_permissions")
      .upsert(fullPayload, {
        onConflict: "workspace_id,user_id",
      })
      .select("*")
      .maybeSingle();

    if (upsertResult.error && isSchemaMismatchError(upsertResult.error)) {
      const legacyPayload = createLegacyPayload(
        workspaceId,
        userId,
        normalizedPermissions,
        customSettings
      );

      upsertResult = await supabase
        .from("dashboard_permissions")
        .upsert(legacyPayload, {
          onConflict: "workspace_id,user_id",
        })
        .select("*")
        .maybeSingle();
    }

    if (upsertResult.error) {
      console.error("Error upserting dashboard permissions:", upsertResult.error);
      return NextResponse.json(
        { success: false, error: upsertResult.error.message || "Failed to save permissions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...normalizedPermissions,
        ...extractPermissionOverrides(upsertResult.data),
      },
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
  { params }: { params: RouteParams }
) {
  return POST(request, { params });
}
