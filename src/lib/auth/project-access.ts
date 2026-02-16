import { createClient } from "@/lib/supabase/server";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

type ProjectAccessScope = "all" | "restricted";

export interface ProjectAccessContext {
  hasFullProjectAccess: boolean;
  accessibleProjectIds: string[];
  isWorkspaceOwner: boolean;
  memberRole: string | null;
  projectAccessScope: ProjectAccessScope;
}

interface WorkspaceRow {
  owner_id: string;
}

interface WorkspaceMemberRow {
  role: string;
  project_access_scope?: string | null;
}

async function getWorkspaceMember(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string
): Promise<WorkspaceMemberRow | null> {
  const withScopeResult = await supabase
    .from("workspace_members")
    .select("role, project_access_scope")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!withScopeResult.error) {
    return (withScopeResult.data as WorkspaceMemberRow | null) ?? null;
  }

  const missingScopeColumn = withScopeResult.error.message?.includes("project_access_scope");
  if (!missingScopeColumn) {
    console.error("Error fetching workspace member with project scope:", withScopeResult.error);
    return null;
  }

  const fallbackResult = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fallbackResult.error) {
    console.error("Error fetching workspace member fallback:", fallbackResult.error);
    return null;
  }

  return (fallbackResult.data as WorkspaceMemberRow | null) ?? null;
}

export async function getProjectAccessContext(
  workspaceId: string,
  userId: string
): Promise<ProjectAccessContext> {
  const supabase = createClient();

  const [workspaceResult, member] = await Promise.all([
    supabase.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle(),
    getWorkspaceMember(supabase, workspaceId, userId),
  ]);

  const workspace = workspaceResult.data as WorkspaceRow | null;
  if (workspaceResult.error || !workspace) {
    return {
      hasFullProjectAccess: false,
      accessibleProjectIds: [],
      isWorkspaceOwner: false,
      memberRole: null,
      projectAccessScope: "restricted",
    };
  }

  const isWorkspaceOwner = workspace.owner_id === userId;
  const memberRole = member?.role || null;
  const projectAccessScope: ProjectAccessScope =
    member?.project_access_scope === "restricted" ? "restricted" : "all";

  const hasPrivilegedRole = memberRole === "owner" || memberRole === "admin";
  const hasFullProjectAccess =
    isWorkspaceOwner || hasPrivilegedRole || projectAccessScope === "all";

  if (hasFullProjectAccess) {
    return {
      hasFullProjectAccess: true,
      accessibleProjectIds: [],
      isWorkspaceOwner,
      memberRole,
      projectAccessScope,
    };
  }

  const projectMembershipsResult = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);

  if (projectMembershipsResult.error) {
    console.error("Error fetching project memberships:", projectMembershipsResult.error);
    return {
      hasFullProjectAccess: false,
      accessibleProjectIds: [],
      isWorkspaceOwner,
      memberRole,
      projectAccessScope,
    };
  }

  const rawProjectIds = Array.from(
    new Set(
      (projectMembershipsResult.data || [])
        .map((membership) => membership.project_id)
        .filter(Boolean)
    )
  ) as string[];

  if (rawProjectIds.length === 0) {
    return {
      hasFullProjectAccess: false,
      accessibleProjectIds: [],
      isWorkspaceOwner,
      memberRole,
      projectAccessScope,
    };
  }

  const workspaceProjectsResult = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("id", rawProjectIds.length > 0 ? rawProjectIds : [EMPTY_UUID]);

  if (workspaceProjectsResult.error) {
    console.error("Error validating workspace project memberships:", workspaceProjectsResult.error);
    return {
      hasFullProjectAccess: false,
      accessibleProjectIds: [],
      isWorkspaceOwner,
      memberRole,
      projectAccessScope,
    };
  }

  const accessibleProjectIds = (workspaceProjectsResult.data || [])
    .map((project) => project.id)
    .filter(Boolean) as string[];

  return {
    hasFullProjectAccess: false,
    accessibleProjectIds,
    isWorkspaceOwner,
    memberRole,
    projectAccessScope,
  };
}

export async function canAccessProject(
  workspaceId: string,
  projectId: string,
  userId: string
): Promise<boolean> {
  const access = await getProjectAccessContext(workspaceId, userId);
  if (access.hasFullProjectAccess) {
    return true;
  }

  return access.accessibleProjectIds.includes(projectId);
}
