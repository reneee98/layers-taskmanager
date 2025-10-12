import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user (optional for testing)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('No user found, continuing without auth for testing');
    }

    // Get workspace_id from request query params
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID je povinný" },
        { status: 400 }
      );
    }

    // Find user in profiles table by id (only if user exists)
    let dbUser = null;
    if (user) {
      const { data: userData, error: dbUserError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (dbUserError || !userData) {
        console.log("User not found in profiles table, continuing without user context");
      } else {
        dbUser = userData;
      }
    }

    // Get recent activities from various sources - ALL USERS IN WORKSPACE
    const activities: any[] = [];
    
    console.log('Fetching activities for workspace:', workspaceId);

    // 1. Recent time entries - ALL USERS
    const { data: timeEntries, error: timeError } = await supabase
      .from("time_entries")
      .select(`
        id,
        hours,
        date,
        description,
        created_at,
        task:tasks(title, project:projects(name, code)),
        user:profiles(display_name)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!timeError && timeEntries) {
      timeEntries.forEach(entry => {
        activities.push({
          id: `time_${entry.id}`,
          type: 'time_entry',
          action: 'Pridal čas',
          details: `${entry.hours}h na ${entry.task?.[0]?.title || 'úlohu'}`,
          project: entry.task?.[0]?.project?.[0]?.name,
          project_code: entry.task?.[0]?.project?.[0]?.code,
          user: entry.user?.[0]?.display_name || 'Neznámy',
          created_at: entry.created_at,
          description: entry.description
        });
      });
    }

    // 2. Recent task updates - ALL USERS (including all changes)
    const { data: taskUpdates, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        estimated_hours,
        actual_hours,
        completed_at,
        created_at,
        updated_at,
        created_by,
        project:projects(name, code),
        assignee:profiles(display_name)
      `)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (!taskError && taskUpdates) {
      // Get creator profiles for tasks
      const creatorIds = Array.from(new Set(taskUpdates.map(t => t.created_by).filter(Boolean)));
      let creatorProfiles: any[] = [];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", creatorIds);
        creatorProfiles = profiles || [];
      }

      taskUpdates.forEach(task => {
        const creator = creatorProfiles.find(p => p.id === task.created_by);
        const assignee = task.assignee?.[0]?.display_name || 'Neznámy';
        const userName = creator?.display_name || creator?.email?.split('@')[0] || 'Systém';
        
        // Check if task was created recently (within last 7 days)
        const isNewTask = new Date(task.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (isNewTask) {
          // New task created
          activities.push({
            id: `task_created_${task.id}`,
            type: 'task_created',
            action: 'Vytvoril úlohu',
            details: task.title,
            project: task.project?.[0]?.name,
            project_code: task.project?.[0]?.code,
            user: userName,
            created_at: task.created_at,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            estimated_hours: task.estimated_hours
          });
        } else {
          // Task updated - check what changed
          const wasCompleted = task.completed_at && new Date(task.completed_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          if (wasCompleted) {
            activities.push({
              id: `task_completed_${task.id}_${task.updated_at}`,
              type: 'task_completed',
              action: 'Dokončil úlohu',
              details: task.title,
              project: task.project?.[0]?.name,
              project_code: task.project?.[0]?.code,
              user: assignee, // Pre dokončenie úlohy je dôležitý assignee
              created_at: task.completed_at,
              status: task.status,
              priority: task.priority,
              actual_hours: task.actual_hours
            });
          }
          
          // General task update - použij creator namiesto assignee
          activities.push({
            id: `task_updated_${task.id}_${task.updated_at}`,
            type: 'task_updated',
            action: 'Aktualizoval úlohu',
            details: task.title,
            project: task.project?.[0]?.name,
            project_code: task.project?.[0]?.code,
            user: userName, // Použij creator namiesto assignee
            created_at: task.updated_at,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            estimated_hours: task.estimated_hours,
            actual_hours: task.actual_hours
          });
        }
      });
    }

    // 3. Recent comments - ALL USERS
    const { data: comments, error: commentError } = await supabase
      .from("task_comments")
      .select(`
        id,
        content,
        created_at,
        task:tasks(title, project:projects(name, code)),
        user:profiles(display_name)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!commentError && comments) {
      comments.forEach(comment => {
        activities.push({
          id: `comment_${comment.id}`,
          type: 'comment',
          action: 'Pridal komentár',
          details: comment.task?.[0]?.title || 'úlohu',
          project: comment.task?.[0]?.project?.[0]?.name,
          project_code: comment.task?.[0]?.project?.[0]?.code,
          user: comment.user?.[0]?.display_name || 'Neznámy',
          created_at: comment.created_at,
          content: comment.content
        });
      });
    }

    // 4. Recent projects - ALL USERS
    const { data: projects, error: projectError } = await supabase
      .from("projects")
      .select(`
        id,
        name,
        code,
        description,
        status,
        start_date,
        end_date,
        budget_hours,
        budget_amount,
        hourly_rate,
        created_at,
        updated_at,
        created_by,
        client:clients(name)
      `)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (!projectError && projects) {
      // Get creator profiles for projects
      const projectCreatorIds = Array.from(new Set(projects.map(p => p.created_by).filter(Boolean)));
      let projectCreators: any[] = [];
      if (projectCreatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", projectCreatorIds);
        projectCreators = profiles || [];
        console.log('Project creators:', projectCreators);
      }

      projects.forEach(project => {
        const creator = projectCreators.find(p => p.id === project.created_by);
        const userName = creator?.display_name || creator?.email?.split('@')[0] || 'Systém';
        
        // Check if project was created recently (within last 7 days)
        const isNewProject = new Date(project.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const wasUpdatedRecently = new Date(project.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (isNewProject) {
          activities.push({
            id: `project_created_${project.id}`,
            type: 'project_created',
            action: 'Vytvoril projekt',
            details: project.name,
            project: project.name,
            project_code: project.code,
            user: userName,
            created_at: project.created_at,
            client: project.client?.[0]?.name,
            status: project.status,
            budget_hours: project.budget_hours,
            budget_amount: project.budget_amount
          });
        } else if (wasUpdatedRecently) {
          activities.push({
            id: `project_updated_${project.id}_${project.updated_at}`,
            type: 'project_updated',
            action: 'Aktualizoval projekt',
            details: project.name,
            project: project.name,
            project_code: project.code,
            user: userName,
            created_at: project.updated_at,
            client: project.client?.[0]?.name,
            status: project.status,
            budget_hours: project.budget_hours,
            budget_amount: project.budget_amount
          });
        }
      });
    }

    // 5. Recent clients - ALL USERS
    const { data: clients, error: clientError } = await supabase
      .from("clients")
      .select(`
        id,
        name,
        email,
        phone,
        created_at,
        updated_at,
        created_by
      `)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (!clientError && clients) {
      // Get creator profiles for clients
      const clientCreatorIds = Array.from(new Set(clients.map(c => c.created_by).filter(Boolean)));
      let clientCreators: any[] = [];
      if (clientCreatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", clientCreatorIds);
        clientCreators = profiles || [];
      }

      clients.forEach(client => {
        const isNewClient = new Date(client.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const wasUpdatedRecently = new Date(client.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const creator = clientCreators.find(p => p.id === client.created_by);
        const userName = creator?.display_name || creator?.email?.split('@')[0] || 'Systém';
        
        if (isNewClient) {
          activities.push({
            id: `client_created_${client.id}`,
            type: 'client_created',
            action: 'Pridal klienta',
            details: client.name,
            user: userName,
            created_at: client.created_at,
            client_email: client.email,
            client_phone: client.phone
          });
        } else if (wasUpdatedRecently) {
          activities.push({
            id: `client_updated_${client.id}_${client.updated_at}`,
            type: 'client_updated',
            action: 'Aktualizoval klienta',
            details: client.name,
            user: userName,
            created_at: client.updated_at,
            client_email: client.email,
            client_phone: client.phone
          });
        }
      });
    }

    // 6. Recent workspace members - ALL USERS
    const { data: members, error: memberError } = await supabase
      .from("workspace_members")
      .select(`
        id,
        role,
        created_at,
        invited_by,
        user_id,
        user:profiles(display_name)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!memberError && members) {
          // Get inviter profiles for members
          const inviterIds = Array.from(new Set(members.map(m => m.invited_by).filter(Boolean)));
      let inviterProfiles: any[] = [];
      if (inviterIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", inviterIds);
        inviterProfiles = profiles || [];
      }

      members.forEach(member => {
        // Check if member was added recently (within last 7 days)
        const isNewMember = new Date(member.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (isNewMember) {
          const inviter = inviterProfiles.find(p => p.id === member.invited_by);
          
          activities.push({
            id: `member_${member.id}`,
            type: 'member_added',
            action: 'Pridal člena do workspace',
            details: `${member.user?.[0]?.display_name || 'Neznámy'} (${member.role})`,
            user: inviter?.display_name || 'Systém',
            created_at: member.created_at
          });
        }
      });
    }

    // Sort activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Limit to 50 most recent activities
    const limitedActivities = activities.slice(0, 50);

    return NextResponse.json({
      success: true,
      data: limitedActivities,
    });
  } catch (error) {
    console.error("Activity API error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { success: false, error: "Neznáma chyba", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}