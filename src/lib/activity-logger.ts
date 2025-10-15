import { createClient } from "@/lib/supabase/server";

export interface ActivityData {
  workspaceId: string;
  userId: string;
  type: string;
  action: string;
  details?: string;
  projectId?: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs user activity to the activities table
 */
export async function logActivity(activityData: ActivityData): Promise<void> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from("activities")
      .insert({
        workspace_id: activityData.workspaceId,
        user_id: activityData.userId,
        type: activityData.type,
        action: activityData.action,
        details: activityData.details || null,
        project_id: activityData.projectId || null,
        task_id: activityData.taskId || null,
        metadata: activityData.metadata || null,
      });

    if (error) {
      console.error("Failed to log activity:", error);
      // Don't throw error to avoid breaking the main operation
    }
  } catch (error) {
    console.error("Error in logActivity:", error);
    // Don't throw error to avoid breaking the main operation
  }
}

/**
 * Helper function to get user display name for activities
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const supabase = createClient();
    
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return "Neznámy používateľ";
    }

    return profile.display_name || "Neznámy používateľ";
  } catch (error) {
    console.error("Error getting user display name:", error);
    return "Neznámy používateľ";
  }
}

/**
 * Helper function to get project name for activities
 */
export async function getProjectName(projectId: string): Promise<string> {
  try {
    const supabase = createClient();
    
    const { data: project, error } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return "Neznámy projekt";
    }

    return project.name;
  } catch (error) {
    console.error("Error getting project name:", error);
    return "Neznámy projekt";
  }
}

/**
 * Helper function to get task title for activities
 */
export async function getTaskTitle(taskId: string): Promise<string> {
  try {
    const supabase = createClient();
    
    const { data: task, error } = await supabase
      .from("tasks")
      .select("title")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      return "Neznáma úloha";
    }

    return task.title;
  } catch (error) {
    console.error("Error getting task title:", error);
    return "Neznáma úloha";
  }
}

/**
 * Predefined activity types
 */
export const ActivityTypes = {
  // Task activities
  TASK_CREATED: "task_created",
  TASK_UPDATED: "task_updated", 
  TASK_COMPLETED: "task_completed",
  TASK_DELETED: "task_deleted",
  TASK_STATUS_CHANGED: "task_status_changed",
  TASK_PRIORITY_CHANGED: "task_priority_changed",
  TASK_ASSIGNED: "task_assigned",
  TASK_UNASSIGNED: "task_unassigned",
  TASK_TITLE_CHANGED: "task_title_changed",
  TASK_DESCRIPTION_CHANGED: "task_description_changed",
  TASK_DUE_DATE_CHANGED: "task_due_date_changed",
  TASK_ESTIMATED_HOURS_CHANGED: "task_estimated_hours_changed",
  TASK_BUDGET_CHANGED: "task_budget_changed",
  TASK_GOOGLE_DRIVE_LINK_CHANGED: "task_google_drive_link_changed",
  
  // Time activities
  TIME_ADDED: "time_added",
  TIME_UPDATED: "time_updated",
  TIME_DELETED: "time_deleted",
  TIME_BILLABLE_CHANGED: "time_billable_changed",
  
  // Timer activities
  TIMER_STARTED: "timer_started",
  TIMER_STOPPED: "timer_stopped",
  TIMER_PAUSED: "timer_paused",
  TIMER_RESUMED: "timer_resumed",
  
  // Comment activities
  COMMENT_ADDED: "comment_added",
  COMMENT_UPDATED: "comment_updated",
  COMMENT_DELETED: "comment_deleted",
  
  // Project activities
  PROJECT_CREATED: "project_created",
  PROJECT_UPDATED: "project_updated",
  PROJECT_DELETED: "project_deleted",
  PROJECT_STATUS_CHANGED: "project_status_changed",
  PROJECT_BUDGET_CHANGED: "project_budget_changed",
  PROJECT_RATE_CHANGED: "project_rate_changed",
  
  // Client activities
  CLIENT_CREATED: "client_created",
  CLIENT_UPDATED: "client_updated",
  CLIENT_DELETED: "client_deleted",
  
  // Cost activities
  COST_ADDED: "cost_added",
  COST_UPDATED: "cost_updated",
  COST_DELETED: "cost_deleted",
  
  // Invoice activities
  INVOICE_CREATED: "invoice_created",
  INVOICE_UPDATED: "invoice_updated",
  INVOICE_DELETED: "invoice_deleted",
  INVOICE_SENT: "invoice_sent",
  INVOICE_PAID: "invoice_paid",
  
  // User activities
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  USER_ROLE_CHANGED: "user_role_changed",
  
  // Workspace activities
  WORKSPACE_CREATED: "workspace_created",
  WORKSPACE_UPDATED: "workspace_updated",
  WORKSPACE_DELETED: "workspace_deleted",
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];
