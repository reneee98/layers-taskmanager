import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getProjectAccessContext } from "@/lib/auth/project-access";
import { getUserAccessibleWorkspaces } from "@/lib/auth/workspace-security";
import { normalizeTimeEntryDescription } from "@/lib/report-time-entry-groups";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedRequestContext } from "@/lib/supabase/request";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  buildTimeEntryDescriptionSuggestions,
  sortFrequentDescriptionSuggestions,
  sortTaskDescriptionSuggestions,
  type TimeEntryDescriptionRow,
} from "@/lib/time-entry-description-suggestions";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  task_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
});

const TASK_SUGGESTION_LIMIT = 8;
const FREQUENT_SUGGESTION_LIMIT = 8;

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedRequestContext(request);

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsedQuery = querySchema.safeParse({
      task_id: request.nextUrl.searchParams.get("task_id"),
      workspace_id: request.nextUrl.searchParams.get("workspace_id"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, error: "Neplatná úloha alebo workspace" },
        { status: 400 }
      );
    }

    const { task_id: taskId, workspace_id: workspaceId } = parsedQuery.data;
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
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (taskError) {
      console.error("Desktop suggestion task verification failed:", taskError);
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

    const taskEntriesQuery = dataClient
      .from("time_entries")
      .select("description, created_at")
      .eq("workspace_id", workspaceId)
      .eq("task_id", taskId)
      .not("description", "is", null)
      .order("created_at", { ascending: false })
      .limit(250);

    let workspaceEntriesQuery = dataClient
      .from("time_entries")
      .select("description, created_at")
      .eq("workspace_id", workspaceId)
      .not("description", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!projectAccess.hasFullProjectAccess) {
      workspaceEntriesQuery = workspaceEntriesQuery.in(
        "project_id",
        projectAccess.accessibleProjectIds
      );
    }

    const [taskEntriesResult, workspaceEntriesResult] = await Promise.all([
      taskEntriesQuery,
      workspaceEntriesQuery,
    ]);

    if (taskEntriesResult.error || workspaceEntriesResult.error) {
      console.error("Desktop timer suggestion query failed:", {
        task: taskEntriesResult.error,
        workspace: workspaceEntriesResult.error,
      });
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa načítať návrhy poznámok" },
        { status: 500 }
      );
    }

    const taskSuggestions = sortTaskDescriptionSuggestions(
      buildTimeEntryDescriptionSuggestions(
        (taskEntriesResult.data || []) as TimeEntryDescriptionRow[]
      )
    ).slice(0, TASK_SUGGESTION_LIMIT);
    const taskSuggestionKeys = new Set(
      taskSuggestions.map((suggestion) => normalizeTimeEntryDescription(suggestion.value))
    );
    const frequentSuggestions = sortFrequentDescriptionSuggestions(
      buildTimeEntryDescriptionSuggestions(
        (workspaceEntriesResult.data || []) as TimeEntryDescriptionRow[]
      )
    )
      .filter(
        (suggestion) =>
          !taskSuggestionKeys.has(normalizeTimeEntryDescription(suggestion.value))
      )
      .slice(0, FREQUENT_SUGGESTION_LIMIT);

    return NextResponse.json(
      {
        success: true,
        data: {
          task: taskSuggestions,
          frequent: frequentSuggestions,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Desktop timer suggestions failed:", error);
    return NextResponse.json(
      { success: false, error: "Návrhy sa nepodarilo načítať" },
      { status: 500 }
    );
  }
}
