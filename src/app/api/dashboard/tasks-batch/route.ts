import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { autoMoveOverdueTasksToToday } from "@/lib/task-utils";

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 1000; // 5 seconds

function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

async function fetchTasks(
  supabase: any,
  workspaceId: string,
  workspaceOwnerId: string,
  user: any,
  isRiesitel: boolean,
  showUnassigned: boolean,
  showAll: boolean
) {
  let tasks;
  let tasksError;

  if (isRiesitel || (!showUnassigned && !showAll)) {
    // Show only assigned tasks to current user
    const { data: taskAssignees, error: assigneesError } = await supabase
      .from("task_assignees")
      .select("task_id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId);

    if (assigneesError) {
      return { tasks: [], error: assigneesError };
    }

    if (!taskAssignees || taskAssignees.length === 0) {
      return { tasks: [], error: null };
    }

    const taskIds = taskAssignees.map((ta: any) => ta.task_id);

    const { data: userTasks, error: userTasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        estimated_hours,
        actual_hours,
        start_date,
        end_date,
        due_date,
        created_at,
        updated_at,
        project_id,
        assignee_id,
        assigned_to,
        budget_cents,
        workspace_id,
        project:projects(
          id,
          name,
          code,
          workspace_id,
          client:clients(name)
        )
      `)
      .in("id", taskIds)
      .eq("workspace_id", workspaceId);
    
    tasks = userTasks;
    tasksError = userTasksError;
  } else if (showUnassigned) {
    // Show unassigned tasks
    const { data: tasksWithAssignees } = await supabase
      .from("task_assignees")
      .select("task_id")
      .eq("workspace_id", workspaceId);
    
      const taskIdsWithAssignees = new Set(tasksWithAssignees?.map((ta: any) => ta.task_id) || []);
    
    const { data: allTasks, error: allTasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        estimated_hours,
        actual_hours,
        start_date,
        end_date,
        due_date,
        created_at,
        updated_at,
        project_id,
        assignee_id,
        assigned_to,
        budget_cents,
        workspace_id,
        project:projects(
          id,
          name,
          code,
          workspace_id,
          client:clients(name)
        )
      `)
      .eq("workspace_id", workspaceId)
      .neq("status", "done")
      .neq("status", "cancelled");
    
    tasks = allTasks?.filter((task: any) => !taskIdsWithAssignees.has(task.id)) || [];
    tasksError = allTasksError;
  } else if (showAll) {
    // Show all active assigned tasks
    const { data: tasksWithAssignees } = await supabase
      .from("task_assignees")
      .select("task_id")
      .eq("workspace_id", workspaceId);
    
      const taskIdsWithAssignees = tasksWithAssignees?.map((ta: any) => ta.task_id) || [];
    
    if (taskIdsWithAssignees.length === 0) {
      return { tasks: [], error: null };
    }
    
    const { data: allTasks, error: allTasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        estimated_hours,
        actual_hours,
        start_date,
        end_date,
        due_date,
        created_at,
        updated_at,
        project_id,
        assignee_id,
        assigned_to,
        budget_cents,
        workspace_id,
        project:projects(
          id,
          name,
          code,
          workspace_id,
          client:clients(name)
        )
      `)
      .eq("workspace_id", workspaceId)
      .neq("status", "done")
      .neq("status", "cancelled")
      .in("id", taskIdsWithAssignees);
    
    tasks = allTasks;
    tasksError = allTasksError;
  }

  if (tasksError) {
    return { tasks: [], error: tasksError };
  }

  if (!tasks || tasks.length === 0) {
    return { tasks: [], error: null };
  }

  return { tasks, error: null };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const workspaceId = await getUserWorkspaceIdFromRequest(req);
    
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID je povinný" },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `tasks-batch:${workspaceId}:${user.id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'private, max-age=5',
        },
      });
    }

    // Check workspace access
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace nebol nájdený" },
        { status: 404 }
      );
    }
    
    const isOwner = workspace.owner_id === user.id;
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();
    
    if (!isOwner && !member) {
      return NextResponse.json(
        { success: false, error: "Nemáte prístup k tomuto workspace" },
        { status: 403 }
      );
    }

    const workspaceOwnerId = workspace.owner_id;

    // Auto-move overdue tasks (non-blocking)
    autoMoveOverdueTasksToToday(supabase, workspaceId).catch(() => {});

    // Check if user has "Riešiteľ" role
    let isRiesitel = false;
    if (!isOwner && member) {
      const isSystemRole = ['owner', 'member'].includes(member.role);
      if (!isSystemRole) {
        const { data: roleCheck } = await supabase
          .from('roles')
          .select('name')
          .eq('id', member.role)
          .single();
        
        if (roleCheck?.name === 'Riešiteľ') {
          isRiesitel = true;
        }
      }
    }

    // OPTIMIZED: Fetch all three task types in parallel
    const [assignedResult, allActiveResult, unassignedResult] = await Promise.all([
      fetchTasks(supabase, workspaceId, workspaceOwnerId, user, isRiesitel, false, false),
      fetchTasks(supabase, workspaceId, workspaceOwnerId, user, isRiesitel, false, true),
      fetchTasks(supabase, workspaceId, workspaceOwnerId, user, isRiesitel, true, false)
    ]);

    // Collect all unique task IDs from all three results
    const allTaskIds = new Set<string>();
    [assignedResult.tasks, allActiveResult.tasks, unassignedResult.tasks].forEach(taskList => {
      taskList.forEach((task: any) => allTaskIds.add(task.id));
    });

    if (allTaskIds.size === 0) {
      const response = {
        success: true,
        data: {
          assigned: [],
          allActive: [],
          unassigned: []
        }
      };
      setCache(cacheKey, response);
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'private, max-age=5',
        },
      });
    }

    // OPTIMIZED: Batch load all assignees, workspace members, and profiles at once
    const taskIdsArray = Array.from(allTaskIds);
    
    const [allAssigneesResult, workspaceMembersResult] = await Promise.all([
      supabase
        .from("task_assignees")
        .select("id, task_id, user_id, assigned_at, assigned_by")
        .in("task_id", taskIdsArray)
        .eq("workspace_id", workspaceId),
      supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
    ]);

    const allAssignees = allAssigneesResult.data || [];
    const workspaceMembers = workspaceMembersResult.data || [];

    // Get all unique user IDs from assignees
    const allUserIds = Array.from(new Set(allAssignees.map(a => a.user_id)));
    
    const memberUserIds = new Set(workspaceMembers.map(m => m.user_id));
    if (workspaceOwnerId) {
      memberUserIds.add(workspaceOwnerId);
    }
    
    // Load all profiles in one query
    const validUserIds = allUserIds.filter(id => memberUserIds.has(id));
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, email, role")
      .in("id", validUserIds.length > 0 ? validUserIds : ['00000000-0000-0000-0000-000000000000']);

    // Create lookup maps for O(1) access
    const assigneesByTaskId = new Map<string, typeof allAssignees>();
    const profilesById = new Map<string, { id: string; display_name: string | null; email: string; role: string }>();
    
    // Group assignees by task_id
    allAssignees.forEach(assignee => {
      if (!assigneesByTaskId.has(assignee.task_id)) {
        assigneesByTaskId.set(assignee.task_id, []);
      }
      assigneesByTaskId.get(assignee.task_id)!.push(assignee);
    });
    
    // Create profile lookup map
    allProfiles?.forEach(profile => {
      profilesById.set(profile.id, profile);
    });

    // Helper function to enrich tasks with assignees
    const enrichTasks = (taskList: any[]) => {
      return taskList.map(task => {
        const assignees = assigneesByTaskId.get(task.id) || [];
        const validAssignees = assignees.filter(a => memberUserIds.has(a.user_id));
        
        const assigneesWithUsers = validAssignees.map(assignee => {
          const profile = profilesById.get(assignee.user_id);
          return {
            ...assignee,
            user: profile ? {
              id: profile.id,
              email: profile.email,
              name: profile.display_name,
              avatar_url: null,
              role: profile.role,
              is_active: true,
              created_at: "",
              updated_at: ""
            } : null
          };
        });

        return {
          ...task,
          assignees: assigneesWithUsers
        };
      });
    };

    // Transform and sort tasks
    const now = new Date();
    const transformAndSort = (taskList: any[]) => {
      return enrichTasks(taskList)
        .map((task) => {
          let daysUntilDeadline = null;
          if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const diffTime = dueDate.getTime() - now.getTime();
            daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
          return {
            ...task,
            days_until_deadline: daysUntilDeadline,
          };
        })
        .filter((task) => task.status !== 'done' && task.status !== 'invoiced')
        .sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
    };

    const response = {
      success: true,
      data: {
        assigned: transformAndSort(assignedResult.tasks),
        allActive: transformAndSort(allActiveResult.tasks),
        unassigned: transformAndSort(unassignedResult.tasks)
      }
    };
    
    setCache(cacheKey, response);
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=5',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Neznáma chyba" },
      { status: 500 }
    );
  }
}

