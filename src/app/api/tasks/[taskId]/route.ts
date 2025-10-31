import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateTaskSchema } from "@/lib/validations/task";
import { validateSchema } from "@/lib/zod-helpers";
import { logActivity, ActivityTypes, getUserDisplayName } from "@/lib/activity-logger";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();

    const { data: task, error } = await supabase
      .from("tasks")
      .select(`
        *,
        project:projects(id, name, code, hourly_rate_cents, budget_cents)
      `)
      .eq("id", taskId)
      .single();

    if (error) {
      console.error(`Task fetch error for ${taskId}:`, error);
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    // Convert hourly_rate_cents and budget_cents back to hourly_rate and fixed_fee for frontend compatibility
    const taskWithHourlyRate = {
      ...task,
      project: task.project ? {
        ...task.project,
        hourly_rate: task.project.hourly_rate_cents ? task.project.hourly_rate_cents / 100 : null,
        fixed_fee: task.project.budget_cents ? task.project.budget_cents / 100 : null
      } : null
    };

    return NextResponse.json({ success: true, data: taskWithHourlyRate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateSchema(updateTaskSchema, body);

    if (!validation.success) {
      return NextResponse.json(validation, { status: 400 });
    }

    const supabase = createClient();

    // Get current user for activity logging
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get current task data for comparison
    const { data: currentTask, error: currentTaskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (currentTaskError || !currentTask) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update(validation.data)
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .select(`
        *,
        project:projects(id, name, code, hourly_rate_cents, budget_cents)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Convert hourly_rate_cents and budget_cents back to hourly_rate and fixed_fee for frontend compatibility
    const taskWithHourlyRate = {
      ...task,
      project: task.project ? {
        ...task.project,
        hourly_rate: task.project.hourly_rate_cents ? task.project.hourly_rate_cents / 100 : null,
        fixed_fee: task.project.budget_cents ? task.project.budget_cents / 100 : null
      } : null
    };

    // Log activity based on what changed
    const userDisplayName = await getUserDisplayName(user.id);
    
    // Check for title change
    if (validation.data.title && validation.data.title !== currentTask.title) {
      await logActivity({
        workspaceId,
        userId: user.id,
        type: ActivityTypes.TASK_TITLE_CHANGED,
        action: `Zmenil názov úlohy z "${currentTask.title}" na "${validation.data.title}"`,
        details: validation.data.title,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          old_title: currentTask.title,
          new_title: validation.data.title,
          user_display_name: userDisplayName
        }
      });
    }

    // Check for description change
    if (validation.data.description !== undefined && validation.data.description !== currentTask.description) {
      await logActivity({
        workspaceId,
        userId: user.id,
        type: ActivityTypes.TASK_DESCRIPTION_CHANGED,
        action: `Zmenil popis úlohy`,
        details: task.title,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          old_description: currentTask.description,
          new_description: validation.data.description,
          user_display_name: userDisplayName
        }
      });
    }

    // Check for status change
    if (validation.data.status && validation.data.status !== currentTask.status) {
      await logActivity({
        workspaceId,
        userId: user.id,
        type: ActivityTypes.TASK_STATUS_CHANGED,
        action: `Zmenil status úlohy z "${currentTask.status}" na "${validation.data.status}"`,
        details: task.title,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          old_status: currentTask.status,
          new_status: validation.data.status,
          user_display_name: userDisplayName
        }
      });
    }

    // Check for priority change
    if (validation.data.priority && validation.data.priority !== currentTask.priority) {
      await logActivity({
        workspaceId,
        userId: user.id,
        type: ActivityTypes.TASK_PRIORITY_CHANGED,
        action: `Zmenil prioritu úlohy z "${currentTask.priority}" na "${validation.data.priority}"`,
        details: task.title,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          old_priority: currentTask.priority,
          new_priority: validation.data.priority,
          user_display_name: userDisplayName
        }
      });
    }

    // Check for assignment change
    if (validation.data.assigned_to !== undefined && validation.data.assigned_to !== currentTask.assigned_to) {
      const activityType = validation.data.assigned_to ? ActivityTypes.TASK_ASSIGNED : ActivityTypes.TASK_UNASSIGNED;
      const action = validation.data.assigned_to ? `Priradil úlohu používateľovi` : `Odstránil priradenie úlohy`;
      
      await logActivity({
        workspaceId,
        userId: user.id,
        type: activityType,
        action: action,
        details: task.title,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          old_assigned_to: currentTask.assigned_to,
          new_assigned_to: validation.data.assigned_to,
          user_display_name: userDisplayName
        }
      });
    }

    // Check for due date change
    if (validation.data.due_date !== undefined && validation.data.due_date !== currentTask.due_date) {
      await logActivity({
        workspaceId,
        userId: user.id,
        type: ActivityTypes.TASK_DUE_DATE_CHANGED,
        action: `Zmenil termín úlohy`,
        details: task.title,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          old_due_date: currentTask.due_date,
          new_due_date: validation.data.due_date,
          user_display_name: userDisplayName
        }
      });

      // Automatically set start_date to today if task is overdue or due today
      // Use currentTask.status (before update) to check if task is done/cancelled
      const taskStatus = validation.data.status !== undefined ? validation.data.status : currentTask.status;
      if (validation.data.due_date && taskStatus !== 'done' && taskStatus !== 'cancelled') {
        // Get today's date in local timezone (YYYY-MM-DD format)
        const now = new Date();
        const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
        
        // Parse due_date (it's already in YYYY-MM-DD format)
        const dueDateParts = validation.data.due_date.split('-');
        const dueDateLocal = new Date(parseInt(dueDateParts[0]), parseInt(dueDateParts[1]) - 1, parseInt(dueDateParts[2]));
        
        // Compare dates (ignoring time)
        const isOverdue = dueDateLocal < todayLocal;
        const isDueToday = dueDateLocal.getTime() === todayLocal.getTime();
        
        console.log(`[Task ${taskId}] Checking auto-set start_date:`, {
          dueDate: validation.data.due_date,
          dueDateLocal: dueDateLocal.toISOString().split('T')[0],
          todayStr,
          todayLocal: todayLocal.toISOString().split('T')[0],
          isOverdue,
          isDueToday,
          currentStartDate: currentTask.start_date,
          taskStatus
        });
        
        // Set start_date to today if overdue or due today
        // For overdue tasks, always set start_date AND due_date to today
        // This ensures overdue tasks appear in "today" tab and are moved to today
        if (isOverdue || isDueToday) {
          const updateData: { start_date: string; due_date?: string } = { start_date: todayStr };
          
          // If task is overdue, also update due_date to today
          if (isOverdue) {
            updateData.due_date = todayStr;
            console.log(`[Task ${taskId}] Auto-setting start_date and due_date to today (${todayStr}) because task is overdue`);
          } else {
            console.log(`[Task ${taskId}] Auto-setting start_date to today (${todayStr}) because task is due today`);
          }
          
          const { error: updateError } = await supabase
            .from("tasks")
            .update(updateData)
            .eq("id", taskId)
            .eq("workspace_id", workspaceId);

          if (updateError) {
            console.error(`[Task ${taskId}] Error updating start_date:`, updateError);
          } else {
            // Reload task to get updated data
            const { data: updatedTask, error: reloadError } = await supabase
              .from("tasks")
              .select(`
                *,
                project:projects(id, name, code, hourly_rate_cents, budget_cents)
              `)
              .eq("id", taskId)
              .single();

            if (reloadError) {
              console.error(`[Task ${taskId}] Error reloading task:`, reloadError);
            } else if (updatedTask) {
              console.log(`[Task ${taskId}] Successfully updated start_date to ${updatedTask.start_date}${isOverdue ? ` and due_date to ${updatedTask.due_date}` : ''}`);
              // Update the returned task data with fresh data
              Object.assign(task, updatedTask);
              taskWithHourlyRate.start_date = updatedTask.start_date;
              if (isOverdue) {
                taskWithHourlyRate.due_date = updatedTask.due_date;
              }
              taskWithHourlyRate.project = updatedTask.project ? {
                ...updatedTask.project,
                hourly_rate: updatedTask.project.hourly_rate_cents ? updatedTask.project.hourly_rate_cents / 100 : null,
                fixed_fee: updatedTask.project.budget_cents ? updatedTask.project.budget_cents / 100 : null
              } : null;
            }
          }
        } else {
          console.log(`[Task ${taskId}] Not auto-setting start_date: isOverdue=${isOverdue}, isDueToday=${isDueToday}`);
        }
      } else {
        console.log(`[Task ${taskId}] Skipping auto-set start_date: taskStatus=${taskStatus}, due_date=${validation.data.due_date}`);
      }
    }

    // Check for estimated hours change
    if (validation.data.estimated_hours !== undefined && validation.data.estimated_hours !== currentTask.estimated_hours) {
      await logActivity({
        workspaceId,
        userId: user.id,
        type: ActivityTypes.TASK_ESTIMATED_HOURS_CHANGED,
        action: `Zmenil odhadované hodiny z ${currentTask.estimated_hours || 0}h na ${validation.data.estimated_hours || 0}h`,
        details: task.title,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          old_estimated_hours: currentTask.estimated_hours,
          new_estimated_hours: validation.data.estimated_hours,
          user_display_name: userDisplayName
        }
      });
    }

    // Check for budget change
    if (validation.data.budget_amount !== undefined && validation.data.budget_amount !== currentTask.budget_amount) {
      await logActivity({
        workspaceId,
        userId: user.id,
        type: ActivityTypes.TASK_BUDGET_CHANGED,
        action: `Zmenil budget úlohy z ${currentTask.budget_amount || 0}€ na ${validation.data.budget_amount || 0}€`,
        details: task.title,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          old_budget: currentTask.budget_amount,
          new_budget: validation.data.budget_amount,
          user_display_name: userDisplayName
        }
      });
    }


    // Check if task was completed
    if (validation.data.status === 'done' && currentTask.status !== 'done') {
      await logActivity({
        workspaceId,
        userId: user.id,
        type: ActivityTypes.TASK_COMPLETED,
        action: `Dokončil úlohu`,
        details: task.title,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          user_display_name: userDisplayName,
          completed_at: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({ success: true, data: taskWithHourlyRate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const supabase = createClient();

    // Get current user for activity logging
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get task data before deletion for activity logging
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("title, project_id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Log activity - task deleted
    const userDisplayName = await getUserDisplayName(user.id);
    await logActivity({
      workspaceId,
      userId: user.id,
      type: ActivityTypes.TASK_DELETED,
      action: `Vymazal úlohu`,
      details: task.title,
      projectId: task.project_id,
      taskId: taskId,
      metadata: {
        user_display_name: userDisplayName,
        deleted_at: new Date().toISOString()
      }
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

