import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: "Chýbajú povinné parametre" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // SECURITY: Check if user is owner of the workspace
    // Only workspace owners can manage invoices
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner (either workspace owner or has owner role)
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    const isOwner = workspace.owner_id === user.id || member?.role === 'owner';

    if (!isOwner) {
      console.log(`SECURITY: User ${user?.email} is not owner of workspace ${workspaceId}, blocking access to invoices`);
      return NextResponse.json({ success: false, error: "Access denied - only workspace owners can manage invoices" }, { status: 403 });
    }

    if (type === 'project') {
      // Mark all done tasks in the project as invoiced (filtered by workspace)
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id")
        .eq("project_id", id)
        .eq("workspace_id", workspaceId)
        .eq("status", "done");

      if (tasksError) {
        return NextResponse.json(
          { success: false, error: tasksError.message },
          { status: 500 }
        );
      }

      if (tasks.length === 0) {
        return NextResponse.json(
          { success: false, error: "Projekt nemá dokončené úlohy" },
          { status: 400 }
        );
      }

      // Update all done tasks to invoiced status
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ 
          status: "invoiced",
          invoiced_at: new Date().toISOString()
        })
        .in("id", tasks.map(t => t.id));

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }

      // Check if all tasks in the project are now invoiced
      const { data: allProjectTasks, error: allTasksError } = await supabase
        .from("tasks")
        .select("id, status")
        .eq("project_id", id)
        .eq("workspace_id", workspaceId);

      if (!allTasksError && allProjectTasks && allProjectTasks.length > 0) {
        // Check if there are any tasks that are not invoiced or cancelled
        // We exclude cancelled tasks because they don't count as active work
        const activeStatuses = ['todo', 'in_progress', 'review', 'done', 'sent_to_client'];
        const hasActiveTasks = allProjectTasks.some(
          task => activeStatuses.includes(task.status)
        );

        // If no active tasks remain (all are invoiced or cancelled), mark project as completed
        if (!hasActiveTasks) {
          const { error: projectUpdateError } = await supabase
            .from("projects")
            .update({ status: "completed" })
            .eq("id", id)
            .eq("workspace_id", workspaceId);

          if (projectUpdateError) {
            console.error("Error updating project status:", projectUpdateError);
            // Don't fail the request if project update fails
          } else {
            console.log(`[Mark Invoiced] Project ${id} marked as completed - all tasks are invoiced or cancelled`);
          }
        } else {
          const activeTaskStatuses = allProjectTasks.filter(t => activeStatuses.includes(t.status)).map(t => t.status);
          console.log(`[Mark Invoiced] Project ${id} not marked as completed - has ${allProjectTasks.length} total tasks, active tasks: ${activeTaskStatuses.join(', ')}`);
        }
      } else if (!allTasksError && (!allProjectTasks || allProjectTasks.length === 0)) {
        // Project has no tasks, mark as completed anyway
        const { error: projectUpdateError } = await supabase
          .from("projects")
          .update({ status: "completed" })
          .eq("id", id)
          .eq("workspace_id", workspaceId);

        if (projectUpdateError) {
          console.error("Error updating project status:", projectUpdateError);
        } else {
          console.log(`Project ${id} marked as completed - has no tasks`);
        }
      }

    } else if (type === 'task') {
      // Get the task to find its project_id
      const { data: task, error: taskFetchError } = await supabase
        .from("tasks")
        .select("project_id")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .single();

      if (taskFetchError || !task) {
        return NextResponse.json(
          { success: false, error: "Úloha nebola nájdená" },
          { status: 404 }
        );
      }

      // Mark single task as invoiced (filtered by workspace)
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ 
          status: "invoiced",
          invoiced_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .eq("status", "done");

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }

      // If task belongs to a project, check if all tasks in that project are now invoiced
      if (task.project_id) {
        const { data: allProjectTasks, error: allTasksError } = await supabase
          .from("tasks")
          .select("id, status")
          .eq("project_id", task.project_id)
          .eq("workspace_id", workspaceId);

        if (!allTasksError && allProjectTasks) {
          // Check if there are any tasks that are not invoiced or cancelled
          const activeStatuses = ['todo', 'in_progress', 'review', 'done', 'sent_to_client'];
          const hasActiveTasks = allProjectTasks.some(
            t => activeStatuses.includes(t.status)
          );

          // If no active tasks remain (all are invoiced or cancelled), mark project as completed
          if (!hasActiveTasks && allProjectTasks.length > 0) {
            const { error: projectUpdateError } = await supabase
              .from("projects")
              .update({ status: "completed" })
              .eq("id", task.project_id)
              .eq("workspace_id", workspaceId);

            if (projectUpdateError) {
              console.error("Error updating project status:", projectUpdateError);
              // Don't fail the request if project update fails
            } else {
              console.log(`Project ${task.project_id} marked as completed after task ${id} was invoiced`);
            }
          } else if (hasActiveTasks) {
            console.log(`Project ${task.project_id} not marked as completed - has active tasks: ${allProjectTasks.filter(t => activeStatuses.includes(t.status)).map(t => t.status).join(', ')}`);
          }
        }
      }

    } else {
      return NextResponse.json(
        { success: false, error: "Neplatný typ" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'project' ? 'Projekt' : 'Úloha'} bola označená ako vyfaktúrovaná`,
    });

  } catch (error) {
    console.error("Error marking as invoiced:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
