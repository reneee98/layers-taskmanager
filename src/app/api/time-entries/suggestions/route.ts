import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { normalizeTimeEntryDescription } from "@/lib/report-time-entry-groups";
import { createClient } from "@/lib/supabase/server";
import {
  buildTimeEntryDescriptionSuggestions,
  sortFrequentDescriptionSuggestions,
  sortTaskDescriptionSuggestions,
  type TimeEntryDescriptionRow,
} from "@/lib/time-entry-description-suggestions";

const querySchema = z.object({
  task_id: z.string().uuid(),
});

const TASK_SUGGESTION_LIMIT = 8;
const FREQUENT_SUGGESTION_LIMIT = 8;

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Používateľ nemá prístup k workspace" },
        { status: 401 }
      );
    }

    const parsedQuery = querySchema.safeParse({
      task_id: request.nextUrl.searchParams.get("task_id"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json({ success: false, error: "Neplatné ID úlohy" }, { status: 400 });
    }

    const supabase = createClient();
    const taskId = parsedQuery.data.task_id;
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (taskError) {
      console.error("Error verifying task for description suggestions:", taskError);
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa overiť úlohu" },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json({ success: false, error: "Úloha sa nenašla" }, { status: 404 });
    }

    const [taskEntriesResult, workspaceEntriesResult] = await Promise.all([
      supabase
        .from("time_entries")
        .select("description, created_at")
        .eq("workspace_id", workspaceId)
        .eq("task_id", taskId)
        .not("description", "is", null)
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("time_entries")
        .select("description, created_at")
        .eq("workspace_id", workspaceId)
        .not("description", "is", null)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    if (taskEntriesResult.error || workspaceEntriesResult.error) {
      console.error("Error fetching timer description suggestions:", {
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
        (suggestion) => !taskSuggestionKeys.has(normalizeTimeEntryDescription(suggestion.value))
      )
      .slice(0, FREQUENT_SUGGESTION_LIMIT);

    return NextResponse.json({
      success: true,
      data: {
        task: taskSuggestions,
        frequent: frequentSuggestions,
      },
    });
  } catch (error) {
    console.error("Error in timer description suggestions GET:", error);
    return NextResponse.json({ success: false, error: "Interná chyba servera" }, { status: 500 });
  }
}
