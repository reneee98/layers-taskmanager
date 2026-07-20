import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType = "status_change" | "comment" | "due_date";

interface NotifyTaskWatchersParams {
  supabase: SupabaseClient;
  taskId: string;
  workspaceId: string;
  projectId?: string | null;
  actorId: string;
  type: NotificationType;
  title: string; // human message, e.g. 'René zmenil status úlohy na "Hotovo"'
  body?: string | null; // context, typically the task title
}

/**
 * Creates in-app notifications for everyone following a task:
 * watchers (task_watchers) + assignees (task_assignees), minus the actor.
 * Never throws — a notification failure must not break the main operation.
 */
export async function notifyTaskWatchers({
  supabase,
  taskId,
  workspaceId,
  projectId,
  actorId,
  type,
  title,
  body,
}: NotifyTaskWatchersParams): Promise<void> {
  try {
    const [{ data: watchers }, { data: assignees }] = await Promise.all([
      supabase.from("task_watchers").select("user_id").eq("task_id", taskId),
      supabase.from("task_assignees").select("user_id").eq("task_id", taskId),
    ]);

    const recipientIds = Array.from(
      new Set(
        [...(watchers ?? []), ...(assignees ?? [])]
          .map((row) => row.user_id as string)
          .filter((id) => id && id !== actorId)
      )
    );

    if (recipientIds.length === 0) return;

    const { error } = await supabase.from("notifications").insert(
      recipientIds.map((userId) => ({
        user_id: userId,
        workspace_id: workspaceId,
        actor_id: actorId,
        type,
        title,
        body: body ?? null,
        task_id: taskId,
        project_id: projectId ?? null,
      }))
    );

    if (error) {
      console.error("[notifyTaskWatchers] insert failed:", error);
    }
  } catch (error) {
    console.error("[notifyTaskWatchers]", error);
  }
}
