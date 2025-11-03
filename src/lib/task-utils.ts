import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Automatically moves all overdue tasks to today by setting their start_date and due_date to today.
 * Only affects tasks that are not done or cancelled.
 * 
 * @param supabase - Supabase client instance
 * @param workspaceId - Workspace ID to filter tasks
 * @returns Number of tasks updated
 */
export async function autoMoveOverdueTasksToToday(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<number> {
  try {
    // Get today's date in local timezone (YYYY-MM-DD format)
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;

    // Find all overdue tasks (due_date < today) that are not done or cancelled
    const { data: overdueTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, due_date, start_date, status")
      .eq("workspace_id", workspaceId)
      .not("status", "eq", "done")
      .not("status", "eq", "cancelled")
      .not("due_date", "is", null)
      .lt("due_date", todayStr);

    if (fetchError) {
      console.error("Error fetching overdue tasks:", fetchError);
      return 0;
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      return 0;
    }

    // Update all overdue tasks to have start_date and due_date set to today
    const taskIds = overdueTasks.map(task => task.id);
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        start_date: todayStr,
        due_date: todayStr
      })
      .in("id", taskIds)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      console.error("Error updating overdue tasks:", updateError);
      return 0;
    }

    console.log(`[Auto-move overdue tasks] Updated ${taskIds.length} overdue tasks to today (${todayStr})`);
    return taskIds.length;
  } catch (error) {
    console.error("Error in autoMoveOverdueTasksToToday:", error);
    return 0;
  }
}

