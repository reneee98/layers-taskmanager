import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

export async function POST(req: NextRequest) {
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
    
    // Move all existing data to this workspace
    const results = {
      clients: 0,
      projects: 0,
      tasks: 0,
      timeEntries: 0,
      comments: 0,
      assignees: 0,
      timers: 0
    };
    
    // Update clients
    const { data: clientsData } = await supabase
      .from('clients')
      .update({ workspace_id: workspace.id })
      .is('workspace_id', null)
      .select('id');
    results.clients = clientsData?.length || 0;
    
    // Update projects
    const { data: projectsData } = await supabase
      .from('projects')
      .update({ workspace_id: workspace.id })
      .is('workspace_id', null)
      .select('id');
    results.projects = projectsData?.length || 0;
    
    // Update tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .update({ workspace_id: workspace.id })
      .is('workspace_id', null)
      .select('id');
    results.tasks = tasksData?.length || 0;
    
    // Update time entries
    const { data: timeEntriesData } = await supabase
      .from('time_entries')
      .update({ workspace_id: workspace.id })
      .is('workspace_id', null)
      .select('id');
    results.timeEntries = timeEntriesData?.length || 0;
    
    // Update task comments
    const { data: commentsData } = await supabase
      .from('task_comments')
      .update({ workspace_id: workspace.id })
      .is('workspace_id', null)
      .select('id');
    results.comments = commentsData?.length || 0;
    
    // Update task assignees
    const { data: assigneesData } = await supabase
      .from('task_assignees')
      .update({ workspace_id: workspace.id })
      .is('workspace_id', null)
      .select('id');
    results.assignees = assigneesData?.length || 0;
    
    // Update task timers
    const { data: timersData } = await supabase
      .from('task_timers')
      .update({ workspace_id: workspace.id })
      .is('workspace_id', null)
      .select('id');
    results.timers = timersData?.length || 0;
    
    return NextResponse.json({ 
      success: true, 
      message: `Data migrated to workspace "${workspace.name}"`,
      results 
    });
    
  } catch (error) {
    console.error("Error migrating data:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
