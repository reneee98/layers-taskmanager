import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, ActivityTypes, getUserDisplayName } from "@/lib/activity-logger";
import { getUserWorkspaceIdFromRequest, getUserWorkspaceId } from "@/lib/auth/workspace";
import { autoMoveOverdueTasksToToday } from "@/lib/task-utils";
import { resolveHourlyRate } from "@/server/rates/resolveHourlyRate";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  let taskId: string = 'unknown';
  try {
    taskId = (await params).taskId;
    
    const supabase = createClient();

    // Get workspace ID for auto-moving overdue tasks
    let workspaceId: string | null = null;
    try {
      workspaceId = await getUserWorkspaceIdFromRequest(request);
    } catch (workspaceError) {
      console.error(`[GET /api/tasks/${taskId}] Error getting workspace ID:`, workspaceError);
      // Continue without workspace ID - task query should still work
    }
    
    if (workspaceId) {
      // Automatically move overdue tasks to today (non-blocking, don't fail request if this fails)
      autoMoveOverdueTasksToToday(supabase, workspaceId).catch(err => {
        console.error("Error in autoMoveOverdueTasksToToday:", err);
      });
    }

    // Build query with workspace_id filter if available (helps with RLS)
    // For tasks without project, we need to query tasks table directly without JOIN
    // Note: RLS policy requires workspace_id check, so we need to ensure it's available
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId);
    
    // Add workspace_id filter if available to help RLS policy
    // If workspaceId is not available, RLS policy will still check workspace_id from the task
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    
    let { data: task, error } = await query.maybeSingle();
    
    console.log(`[GET /api/tasks/${taskId}] Initial query result:`, { 
      hasTask: !!task, 
      hasError: !!error, 
      errorCode: error?.code, 
      errorMessage: error?.message,
      workspaceId 
    });
    
    // If task not found, try to get workspace_id from task itself
    // This helps with RLS policy which requires workspace_id check
    // Task might be in a different workspace than the one we're filtering by
    if (!task) {
      console.log(`[GET /api/tasks/${taskId}] Task not found without workspaceId, trying to get workspace_id...`);
      
      // First, try to get workspace_id from the task using SECURITY DEFINER function
      // This bypasses RLS restrictions
      const { data: taskWorkspaceData, error: workspaceError } = await supabase
        .rpc('get_task_workspace_id', { task_id_param: taskId });
      
      const taskWorkspace = taskWorkspaceData ? { workspace_id: taskWorkspaceData } : null;
      
      console.log(`[GET /api/tasks/${taskId}] Workspace query result:`, { 
        hasWorkspace: !!taskWorkspace, 
        workspaceId: taskWorkspace?.workspace_id,
        hasError: !!workspaceError,
        errorCode: workspaceError?.code,
        errorMessage: workspaceError?.message
      });
      
      if (taskWorkspace?.workspace_id) {
        // Retry query with workspace_id
        const retryQuery = supabase
          .from("tasks")
          .select("*")
          .eq("id", taskId)
          .eq("workspace_id", taskWorkspace.workspace_id);
        
        const retryResult = await retryQuery.maybeSingle();
        console.log(`[GET /api/tasks/${taskId}] Retry query result:`, { 
          hasTask: !!retryResult.data, 
          hasError: !!retryResult.error,
          errorCode: retryResult.error?.code,
          errorMessage: retryResult.error?.message
        });
        
        if (retryResult.data) {
          task = retryResult.data;
          error = null;
          workspaceId = taskWorkspace.workspace_id; // Update workspaceId for later use
        } else if (retryResult.error) {
          error = retryResult.error;
        }
      } else {
        // If we still can't get workspace_id, try user's default workspace
        const userWorkspaceId = await getUserWorkspaceId();
        console.log(`[GET /api/tasks/${taskId}] User's default workspace:`, userWorkspaceId);
        
        if (userWorkspaceId) {
          const retryQuery = supabase
            .from("tasks")
            .select("*")
            .eq("id", taskId)
            .eq("workspace_id", userWorkspaceId);
          
          const retryResult = await retryQuery.maybeSingle();
          console.log(`[GET /api/tasks/${taskId}] User workspace retry result:`, { 
            hasTask: !!retryResult.data, 
            hasError: !!retryResult.error,
            errorCode: retryResult.error?.code,
            errorMessage: retryResult.error?.message
          });
          
          if (retryResult.data) {
            task = retryResult.data;
            error = null;
            workspaceId = userWorkspaceId;
          } else if (retryResult.error) {
            error = retryResult.error;
          }
        }
      }
    }

    if (error) {
      console.error(`Task fetch error for ${taskId}:`, error);
      console.error(`Error code: ${error.code}, Message: ${error.message}`);
      
      // If RLS blocks access (PGRST301 or similar), return 403 instead of 404
      if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('row-level security')) {
        return NextResponse.json({ 
          success: false, 
          error: "Nemáte oprávnenie na zobrazenie tejto úlohy. Skontrolujte, či máte 'tasks.read' permission." 
        }, { status: 403 });
      }
      
      // Return 404 for not found, 400 for bad request (invalid UUID, etc.)
      const status = error.code === 'PGRST116' ? 404 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }

    if (!task) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
    }

    // Fetch project separately if task has project_id (avoids RLS issues with LEFT JOIN)
    let project = null;
    if (task.project_id) {
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, name, code, hourly_rate_cents, budget_cents")
        .eq("id", task.project_id)
        .maybeSingle();
      
      project = projectData;
    }

    // Fetch assignees for this task
    let assigneesWithUsers: any[] = [];
    if (workspaceId) {
      // Get workspace owner ID for filtering assignees
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();
      
      const workspaceOwnerId = workspace?.owner_id;

      const { data: assignees } = await supabase
        .from("task_assignees")
        .select("*")
        .eq("task_id", taskId)
        .eq("workspace_id", workspaceId)
        .order("assigned_at", { ascending: false });

      if (assignees && assignees.length > 0) {
        const userIds = assignees.map(a => a.user_id);
        
        // Check which users are workspace members
        const { data: workspaceMembers } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", workspaceId)
          .in("user_id", userIds);
        
        const memberUserIds = new Set(workspaceMembers?.map(m => m.user_id) || []);
        // Add workspace owner if exists
        if (workspaceOwnerId) {
          memberUserIds.add(workspaceOwnerId);
        }
        
        // Filter assignees to only workspace members
        const validAssignees = assignees.filter(a => memberUserIds.has(a.user_id));
        
        if (validAssignees.length > 0) {
          const validUserIds = validAssignees.map(a => a.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, email, role")
            .in("id", validUserIds);
          
          assigneesWithUsers = validAssignees.map(assignee => {
            const profile = profiles?.find(p => p.id === assignee.user_id);
            return {
              ...assignee,
              user: profile ? {
                id: profile.id,
                display_name: profile.display_name,
                email: profile.email,
                role: profile.role,
                name: profile.display_name || profile.email?.split('@')[0] || 'Neznámy'
              } : null
            };
          });
        }
      }
    }

    // Convert hourly_rate_cents and budget_cents back to hourly_rate and fixed_fee for frontend compatibility
    const taskWithHourlyRate = {
      ...task,
      project: project ? {
        ...project,
        hourly_rate: project.hourly_rate_cents ? project.hourly_rate_cents / 100 : null,
        fixed_fee: project.budget_cents ? project.budget_cents / 100 : null
      } : null,
      assignees: assigneesWithUsers
    };

    return NextResponse.json({ success: true, data: taskWithHourlyRate }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[GET /api/tasks/${taskId}] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  let taskId: string = 'unknown';
  try {
    taskId = (await params).taskId;
    // Dynamic import to avoid loading validation schema in GET handler
    const { updateTaskSchema } = await import("@/lib/validations/task");
    const { validateSchema } = await import("@/lib/zod-helpers");
    
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    
    // Explicitly handle null for project_id
    if (body.project_id === null || body.project_id === 'null' || body.project_id === '') {
      body.project_id = null;
    }
    
    const validation = validateSchema(updateTaskSchema, body);

    if (!validation.success) {
      console.error("Validation failed:", validation.error);
      console.error("Request body:", body);
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

    // Determine which project to use for calculations
    const projectIdForBudget = validation.data.project_id !== undefined 
      ? validation.data.project_id 
      : currentTask.project_id;
    
    // Get hourly rate - priority: task.hourly_rate_cents > project.hourly_rate_cents
    let hourlyRateCents: number | null = null;
    
    // Priority 1: Check if task has hourly_rate_cents (for tasks without project)
    if (validation.data.hourly_rate_cents !== undefined && validation.data.hourly_rate_cents !== null) {
      hourlyRateCents = validation.data.hourly_rate_cents;
    } else if (currentTask.hourly_rate_cents !== undefined && currentTask.hourly_rate_cents !== null) {
      hourlyRateCents = currentTask.hourly_rate_cents;
    }
    
    // Priority 2: Check project hourly rate (for tasks with project)
    if (!hourlyRateCents && projectIdForBudget) {
      const { data: project } = await supabase
        .from("projects")
        .select("hourly_rate_cents")
        .eq("id", projectIdForBudget)
        .single();
      
      hourlyRateCents = project?.hourly_rate_cents || null;
    }
    
    // Priority 3: Check user_settings.default_hourly_rate (for tasks without project)
    if (!hourlyRateCents && !projectIdForBudget) {
      const { data: userSettings } = await supabase
        .from("user_settings")
        .select("default_hourly_rate")
        .eq("user_id", user.id)
        .single();
      
      if (userSettings?.default_hourly_rate != null) {
        hourlyRateCents = Math.round(userSettings.default_hourly_rate * 100);
      }
    }

    // If budget_cents is set, automatically calculate estimated_hours = budget_cents / hourly_rate
    // Only if estimated_hours is not explicitly set (allows manual override)
    if (validation.data.budget_cents !== undefined && 
        validation.data.budget_cents !== null && 
        validation.data.budget_cents > 0 && 
        hourlyRateCents &&
        hourlyRateCents > 0 &&
        (validation.data.estimated_hours === undefined || validation.data.estimated_hours === null)) {
      // Calculate estimated_hours from budget
      const hourlyRate = hourlyRateCents / 100; // Convert cents to euros
      const budgetInEuros = validation.data.budget_cents / 100; // Convert cents to euros
      const calculatedHours = budgetInEuros / hourlyRate;
      validation.data.estimated_hours = Math.round(calculatedHours * 100) / 100; // Round to 2 decimal places
      console.log(`Auto-calculated estimated_hours from budget: ${validation.data.estimated_hours}h (budget: ${budgetInEuros}€, rate: ${hourlyRate}€/h)`);
    }

    // If estimated_hours is set, automatically calculate budget = estimated_hours * hourly_rate
    // Budget is always recalculated when estimated_hours changes (unless budget_cents is explicitly set to override)
    if (validation.data.estimated_hours !== undefined && 
        validation.data.estimated_hours !== null && 
        validation.data.estimated_hours > 0 && 
        hourlyRateCents &&
        hourlyRateCents > 0) {
      // Only calculate budget if budget_cents is not explicitly set in the request
      // This allows manual override if needed
      if (validation.data.budget_cents === undefined) {
        // Calculate budget: estimated_hours * hourly_rate (convert from cents to euros, then back to cents)
        const hourlyRate = hourlyRateCents / 100; // Convert cents to euros
        const budgetInEuros = validation.data.estimated_hours * hourlyRate;
        validation.data.budget_cents = Math.round(budgetInEuros * 100); // Convert back to cents
        console.log(`Auto-calculated budget from estimated_hours: ${budgetInEuros}€ (hours: ${validation.data.estimated_hours}h, rate: ${hourlyRate}€/h)`);
      }
    }

    // Prepare update data - explicitly handle null for project_id
    // IMPORTANT: When only project_id is changed, all other task values (deadline, status, priority, etc.)
    // are preserved because Supabase UPDATE only changes fields that are explicitly included in updateData.
    // Fields not included in updateData remain unchanged.
    const updateData: any = { ...validation.data };
    
    // If project_id is explicitly set to null, we need to handle it specially
    if (validation.data.project_id === null) {
      // For Supabase, we need to explicitly set the field to null
      updateData.project_id = null;
    } else if (validation.data.project_id === undefined) {
      // If project_id is not in the update, don't include it
      delete updateData.project_id;
    }
    
    // Handle sales_commission_user_id null values
    if (validation.data.sales_commission_user_id === null) {
      updateData.sales_commission_user_id = null;
    } else if (validation.data.sales_commission_user_id === undefined) {
      delete updateData.sales_commission_user_id;
    }
    
    // Handle sales_commission_enabled - ensure it's a boolean or null
    if (validation.data.sales_commission_enabled !== undefined) {
      updateData.sales_commission_enabled = validation.data.sales_commission_enabled;
    }
    
    // Handle sales_commission_percent - ensure it's a number or null
    if (validation.data.sales_commission_percent !== undefined) {
      updateData.sales_commission_percent = validation.data.sales_commission_percent;
    }
    
    // Log what we're updating to ensure only intended fields are changed
    console.log('Updating task with data:', JSON.stringify(updateData, null, 2));
    console.log('Current task values (will be preserved if not in updateData):', {
      due_date: currentTask.due_date,
      start_date: currentTask.start_date,
      end_date: currentTask.end_date,
      status: currentTask.status,
      priority: currentTask.priority,
      estimated_hours: currentTask.estimated_hours,
      actual_hours: currentTask.actual_hours,
      assigned_to: currentTask.assigned_to,
    });
    
    // Check if budget_cents, estimated_hours, or hourly_rate_cents changed - if so, we need to recalculate time entries
    const budgetChanged = updateData.budget_cents !== undefined && 
      updateData.budget_cents !== currentTask.budget_cents;
    const estimatedHoursChanged = updateData.estimated_hours !== undefined && 
      updateData.estimated_hours !== currentTask.estimated_hours;
    const hourlyRateChanged = updateData.hourly_rate_cents !== undefined && 
      updateData.hourly_rate_cents !== currentTask.hourly_rate_cents;

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .select(`
        *,
        project:projects(id, name, code, hourly_rate_cents, budget_cents)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      console.error('Update data:', updateData);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // If budget, estimated_hours, or hourly_rate_cents changed, recalculate all time entries for this task
    if (budgetChanged || estimatedHoursChanged || hourlyRateChanged) {
      console.log('Budget, estimated_hours, or hourly_rate_cents changed, recalculating time entries...');
      
      // Get all time entries for this task
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("id, hours, hourly_rate, user_id, date")
        .eq("task_id", taskId)
        .order("date", { ascending: true }); // Process in chronological order

      if (timeEntries && timeEntries.length > 0) {
        // Determine budget hours limit
        let budgetHoursLimit = 0;
        const finalBudgetCents = task.budget_cents || 0;
        const finalEstimatedHours = task.estimated_hours || 0;
        
        // Get hourly rate - priority: task.hourly_rate_cents > first entry > project > resolve
        let hourlyRate = 0;
        if (task.hourly_rate_cents && task.hourly_rate_cents > 0) {
          hourlyRate = task.hourly_rate_cents / 100;
        } else if (timeEntries[0]?.hourly_rate) {
          hourlyRate = timeEntries[0].hourly_rate;
        } else if (timeEntries[0]?.user_id && task.project_id) {
          const resolved = await resolveHourlyRate(timeEntries[0].user_id, task.project_id);
          hourlyRate = resolved.hourlyRate;
        } else if (task.project?.hourly_rate_cents) {
          hourlyRate = task.project.hourly_rate_cents / 100;
        } else if (timeEntries[0]?.user_id && !task.project_id) {
          // Task has no project - check user_settings.default_hourly_rate
          const { data: userSettings } = await supabase
            .from("user_settings")
            .select("default_hourly_rate")
            .eq("user_id", timeEntries[0].user_id)
            .single();
          
          if (userSettings?.default_hourly_rate != null) {
            hourlyRate = Number(userSettings.default_hourly_rate);
          }
        }

        if (finalBudgetCents > 0 && hourlyRate > 0) {
          const budgetInEuros = finalBudgetCents / 100;
          budgetHoursLimit = budgetInEuros / hourlyRate;
        } else if (finalEstimatedHours > 0) {
          budgetHoursLimit = finalEstimatedHours;
        }

        // Recalculate amounts for all entries in chronological order
        let cumulativeHours = 0;

        for (const entry of timeEntries) {
          // Use task.hourly_rate_cents if available and changed, otherwise use entry's existing rate
          let entryRate = entry.hourly_rate || hourlyRate;
          
          // If hourly_rate_cents changed, use the new rate for all entries
          if (hourlyRateChanged && hourlyRate > 0) {
            entryRate = hourlyRate;
          }
          
          // Calculate how many hours from this entry are within budget
          const hoursWithinBudget = Math.max(0, Math.min(cumulativeHours, budgetHoursLimit));
          const remainingBudgetHours = Math.max(0, budgetHoursLimit - hoursWithinBudget);
          const newHoursWithinBudget = Math.min(entry.hours, remainingBudgetHours);
          
          // Hours that exceed the budget limit
          const hoursOverBudget = Math.max(0, entry.hours - newHoursWithinBudget);
          
          // Calculate new amount
          const newAmount = hoursOverBudget * entryRate;
          
          // Update entry with new amount and potentially new hourly_rate
          const updateData: any = { amount: newAmount };
          if (hourlyRateChanged && hourlyRate > 0) {
            updateData.hourly_rate = entryRate;
          }
          
          await supabase
            .from("time_entries")
            .update(updateData)
            .eq("id", entry.id);

          cumulativeHours += entry.hours;
        }
        
        console.log(`Recalculated ${timeEntries.length} time entries`);
      }
    }

    // Verify that all other task values were preserved (especially important when only project_id is changed)
    const preservedFields = {
      due_date: task.due_date === currentTask.due_date ? '✅ preserved' : `❌ changed from ${currentTask.due_date} to ${task.due_date}`,
      start_date: task.start_date === currentTask.start_date ? '✅ preserved' : `❌ changed from ${currentTask.start_date} to ${task.start_date}`,
      end_date: task.end_date === currentTask.end_date ? '✅ preserved' : `❌ changed from ${currentTask.end_date} to ${task.end_date}`,
      status: task.status === currentTask.status ? '✅ preserved' : `❌ changed from ${currentTask.status} to ${task.status}`,
      priority: task.priority === currentTask.priority ? '✅ preserved' : `❌ changed from ${currentTask.priority} to ${task.priority}`,
      estimated_hours: task.estimated_hours === currentTask.estimated_hours ? '✅ preserved' : `❌ changed from ${currentTask.estimated_hours} to ${task.estimated_hours}`,
      actual_hours: task.actual_hours === currentTask.actual_hours ? '✅ preserved' : `❌ changed from ${currentTask.actual_hours} to ${task.actual_hours}`,
      assigned_to: task.assigned_to === currentTask.assigned_to ? '✅ preserved' : `❌ changed from ${currentTask.assigned_to} to ${task.assigned_to}`,
    };
    
    console.log('Task values after update (preservation check):', preservedFields);

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

    // Check for project change (including setting to null)
    if (validation.data.project_id !== undefined && validation.data.project_id !== currentTask.project_id) {
      let oldProject = null;
      let newProject = null;
      
      if (currentTask.project_id) {
        const { data } = await supabase
          .from("projects")
          .select("name, code")
          .eq("id", currentTask.project_id)
          .single();
        oldProject = data;
      }
      
      if (validation.data.project_id) {
        const { data } = await supabase
          .from("projects")
          .select("name, code")
          .eq("id", validation.data.project_id)
          .single();
        newProject = data;
      }

      const action = validation.data.project_id 
        ? `Presunul úlohu z projektu "${oldProject?.name || 'Bez projektu'}" do projektu "${newProject?.name || 'Neznámy'}"`
        : `Odstránil projekt "${oldProject?.name || 'Neznámy'}" z úlohy`;

      // Convert project_id from null to undefined for logActivity
      const projectIdForLog: string | undefined = 
        validation.data.project_id === null || validation.data.project_id === undefined
          ? undefined
          : (validation.data.project_id as string);

      await logActivity({
        workspaceId,
        userId: user.id,
        type: ActivityTypes.TASK_UPDATED,
        action: action,
        details: task.title,
        projectId: projectIdForLog,
        taskId: task.id,
        metadata: {
          old_project_id: currentTask.project_id,
          old_project_name: oldProject?.name,
          new_project_id: validation.data.project_id,
          new_project_name: newProject?.name,
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
      // Use currentTask.status (before update) to check if task is done/cancelled/sent_to_client
      const taskStatus = validation.data.status !== undefined ? validation.data.status : currentTask.status;
      if (validation.data.due_date && taskStatus !== 'done' && taskStatus !== 'cancelled' && taskStatus !== 'sent_to_client') {
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

