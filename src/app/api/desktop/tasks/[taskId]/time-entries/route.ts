import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getProjectAccessContext } from "@/lib/auth/project-access";
import { getUserAccessibleWorkspaces } from "@/lib/auth/workspace-security";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedRequestContext } from "@/lib/supabase/request";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  workspace_id: z.string().uuid(),
});

const TIME_ENTRY_LIMIT = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const parsedTaskId = z.string().uuid().safeParse(taskId);
    const parsedQuery = querySchema.safeParse({
      workspace_id: request.nextUrl.searchParams.get("workspace_id"),
    });

    if (!parsedTaskId.success || !parsedQuery.success) {
      return NextResponse.json(
        { success: false, error: "Neplatná úloha alebo workspace" },
        { status: 400 }
      );
    }

    const { supabase, user } = await getAuthenticatedRequestContext(request);

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = parsedQuery.data.workspace_id;
    const workspaces = await getUserAccessibleWorkspaces(user.id);

    if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
      return NextResponse.json(
        { success: false, error: "K tomuto workspace nemáte prístup" },
        { status: 403 }
      );
    }

    const serviceClient = createServiceClient();
    const dataClient = (serviceClient || supabase) as ReturnType<typeof createServerClient>;
    const projectAccess = await getProjectAccessContext(workspaceId, user.id, dataClient);
    const { data: task, error: taskError } = await dataClient
      .from("tasks")
      .select("id, project_id")
      .eq("id", parsedTaskId.data)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (taskError) {
      console.error("Desktop time-entry task verification failed:", taskError);
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa overiť úlohu" },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json({ success: false, error: "Úloha sa nenašla" }, { status: 404 });
    }

    if (
      !projectAccess.hasFullProjectAccess &&
      (!task.project_id || !projectAccess.accessibleProjectIds.includes(task.project_id))
    ) {
      return NextResponse.json(
        { success: false, error: "K tejto úlohe nemáte prístup" },
        { status: 403 }
      );
    }

    const { data: entries, error: entriesError, count } = await dataClient
      .from("time_entries")
      .select(
        "id, user_id, hours, date, description, start_time, end_time, created_at",
        { count: "exact" }
      )
      .eq("workspace_id", workspaceId)
      .eq("task_id", parsedTaskId.data)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(TIME_ENTRY_LIMIT);

    if (entriesError) {
      console.error("Desktop task time-entry query failed:", entriesError);
      return NextResponse.json(
        { success: false, error: "Časové záznamy sa nepodarilo načítať" },
        { status: 500 }
      );
    }

    const userIds = Array.from(
      new Set((entries || []).map((entry) => entry.user_id).filter(Boolean))
    );
    const { data: profiles, error: profilesError } = userIds.length
      ? await dataClient
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds)
      : { data: [], error: null };

    if (profilesError) {
      console.warn("Desktop task time-entry profile query failed:", profilesError);
    }

    const profileNames = new Map(
      (profiles || []).map((profile) => [
        profile.id,
        profile.display_name?.trim() || profile.email?.trim() || "Neznámy používateľ",
      ])
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          entries: (entries || []).map((entry) => ({
            ...entry,
            user_name: profileNames.get(entry.user_id) || "Neznámy používateľ",
          })),
          total_count: count || 0,
          has_more: (count || 0) > TIME_ENTRY_LIMIT,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Desktop task time entries failed:", error);
    return NextResponse.json(
      { success: false, error: "Časové záznamy sa nepodarilo načítať" },
      { status: 500 }
    );
  }
}
