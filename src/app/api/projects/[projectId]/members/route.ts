import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import type { ProjectMemberOption } from "@/types/project-members";

export const dynamic = "force-dynamic";

const memberSchema = z.object({ user_id: z.string().uuid() }).strict();
const projectIdSchema = z.string().uuid();
type RouteContext = { params: { projectId: string } };

const failure = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

// Resolve the workspace from the project itself, never from a submitted workspace ID.
const getContext = async (projectId: string) => {
  if (!projectIdSchema.safeParse(projectId).success) {
    return { response: failure("Neplatný projekt", 400) };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { response: failure("Nie ste prihlásený", 401) };

  const client = createServiceClient() ?? supabase;
  const { data: project, error: projectError } = await client
    .from("projects")
    .select("workspace_id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) return { response: failure("Projekt nebol nájdený", 404) };

  const [workspaceResult, membersResult] = await Promise.all([
    client.from("workspaces").select("owner_id").eq("id", project.workspace_id).maybeSingle(),
    client
      .from("workspace_members")
      .select("user_id, role, project_access_scope")
      .eq("workspace_id", project.workspace_id),
  ]);
  if (workspaceResult.error) throw workspaceResult.error;
  if (membersResult.error) throw membersResult.error;
  if (!workspaceResult.data) return { response: failure("Tím nebol nájdený", 404) };

  const ownerId = workspaceResult.data.owner_id as string;
  const members = (membersResult.data ?? []) as Array<{
    user_id: string;
    role: string;
    project_access_scope: string;
  }>;
  const currentMember = members.find((member) => member.user_id === user.id);
  const canManage = ownerId === user.id || currentMember?.role === "owner";
  if (!canManage && !currentMember) {
    return { response: failure("Nemáte prístup k tomuto projektu", 403) };
  }

  if (
    !canManage &&
    currentMember?.role !== "admin" &&
    currentMember?.project_access_scope !== "all"
  ) {
    const { data: assignment, error } = await client
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!assignment) return { response: failure("Nemáte prístup k tomuto projektu", 403) };
  }

  const canEdit =
    canManage || currentMember?.role === "admin" || currentMember?.project_access_scope === "all";
  return { client, ownerId, members, canManage, canEdit };
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const context = await getContext(params.projectId);
    if (context.response) return context.response;
    const { client, ownerId, members, canManage } = context;
    if (request.nextUrl.searchParams.get("access_only") === "true") {
      return NextResponse.json({
        success: true,
        data: [],
        can_manage_members: canManage,
        can_edit_project: context.canEdit,
      });
    }
    // Team directory and access controls are visible only to workspace owners.
    if (!canManage) {
      return NextResponse.json({
        success: true,
        data: [],
        can_manage_members: false,
        can_edit_project: context.canEdit,
      });
    }

    const userIds = Array.from(new Set([ownerId, ...members.map((member) => member.user_id)]));
    const [profilesResult, assignmentsResult] = await Promise.all([
      client.from("profiles").select("id, display_name, email").in("id", userIds),
      client.from("project_members").select("user_id").eq("project_id", params.projectId),
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;

    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    const assignedIds = new Set((assignmentsResult.data ?? []).map((member) => member.user_id));
    const data: ProjectMemberOption[] = userIds
      .map((userId) => {
        const member = members.find((entry) => entry.user_id === userId);
        const profile = profiles.get(userId);
        const isPrivileged =
          userId === ownerId || member?.role === "owner" || member?.role === "admin";
        return {
          user_id: userId,
          display_name: profile?.display_name || profile?.email || "Člen tímu",
          email: profile?.email || "",
          is_assigned: assignedIds.has(userId),
          has_full_access: isPrivileged || member?.project_access_scope === "all",
          is_privileged: isPrivileged,
        };
      })
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "sk"));

    return NextResponse.json({
      success: true,
      data,
      can_manage_members: true,
      can_edit_project: true,
    });
  } catch (error) {
    console.error("Error fetching project members:", error);
    return failure("Nepodarilo sa načítať členov projektu", 500);
  }
}

const changeMember = async (request: NextRequest, { params }: RouteContext, remove: boolean) => {
  try {
    const context = await getContext(params.projectId);
    if (context.response) return context.response;
    if (!context.canManage) return failure("Členov projektu môže spravovať iba majiteľ tímu", 403);

    const body = await request.json().catch(() => null);
    const parsed = memberSchema.safeParse(body);
    if (!parsed.success) return failure("Vyberte platného člena tímu", 400);
    const userId = parsed.data.user_id;
    const member = context.members.find((entry) => entry.user_id === userId);
    if (userId === context.ownerId || member?.role === "owner" || member?.role === "admin") {
      return failure("Majitelia a administrátori majú prístup ku všetkým projektom", 400);
    }
    if (!member) return failure("Používateľ nie je členom tímu tohto projektu", 400);

    // Change only this project; keep access to other projects, workspace scope and rates intact.
    const { error } = remove
      ? await context.client
          .from("project_members")
          .delete()
          .eq("project_id", params.projectId)
          .eq("user_id", userId)
      : await context.client
          .from("project_members")
          .upsert(
            { project_id: params.projectId, user_id: userId, role: "member" },
            { onConflict: "project_id,user_id", ignoreDuplicates: true }
          );
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing project member:", error);
    return failure("Nepodarilo sa zmeniť členov projektu", 500);
  }
};

export const POST = (request: NextRequest, context: RouteContext) =>
  changeMember(request, context, false);
export const DELETE = (request: NextRequest, context: RouteContext) =>
  changeMember(request, context, true);
