import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createClient();
    
    // Get user's workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, description, owner_id')
      .eq('owner_id', user.id)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    // Count data in workspace
    const [
      { count: clientsCount },
      { count: projectsCount },
      { count: tasksCount },
      { count: timeEntriesCount },
      { count: commentsCount },
      { count: assigneesCount },
      { count: timersCount }
    ] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      supabase.from('time_entries').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      supabase.from('task_comments').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      supabase.from('task_assignees').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      supabase.from('task_timers').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id)
    ]);
    
    // Count data without workspace_id (not migrated yet)
    const [
      { count: clientsWithoutWorkspace },
      { count: projectsWithoutWorkspace },
      { count: tasksWithoutWorkspace },
      { count: timeEntriesWithoutWorkspace },
      { count: commentsWithoutWorkspace },
      { count: assigneesWithoutWorkspace },
      { count: timersWithoutWorkspace }
    ] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).is('workspace_id', null),
      supabase.from('projects').select('id', { count: 'exact', head: true }).is('workspace_id', null),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).is('workspace_id', null),
      supabase.from('time_entries').select('id', { count: 'exact', head: true }).is('workspace_id', null),
      supabase.from('task_comments').select('id', { count: 'exact', head: true }).is('workspace_id', null),
      supabase.from('task_assignees').select('id', { count: 'exact', head: true }).is('workspace_id', null),
      supabase.from('task_timers').select('id', { count: 'exact', head: true }).is('workspace_id', null)
    ]);
    
    const dataInWorkspace = {
      clients: clientsCount || 0,
      projects: projectsCount || 0,
      tasks: tasksCount || 0,
      timeEntries: timeEntriesCount || 0,
      comments: commentsCount || 0,
      assignees: assigneesCount || 0,
      timers: timersCount || 0
    };
    
    const dataNotMigrated = {
      clients: clientsWithoutWorkspace || 0,
      projects: projectsWithoutWorkspace || 0,
      tasks: tasksWithoutWorkspace || 0,
      timeEntries: timeEntriesWithoutWorkspace || 0,
      comments: commentsWithoutWorkspace || 0,
      assignees: assigneesWithoutWorkspace || 0,
      timers: timersWithoutWorkspace || 0
    };
    
    return NextResponse.json({ 
      success: true, 
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description
      },
      dataInWorkspace,
      dataNotMigrated,
      needsMigration: Object.values(dataNotMigrated).some(count => count > 0)
    });
    
  } catch (error) {
    console.error("Error checking workspace data:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
