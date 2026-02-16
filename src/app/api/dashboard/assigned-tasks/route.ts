import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { autoMoveOverdueTasksToToday } from "@/lib/task-utils";
import { getProjectAccessContext } from "@/lib/auth/project-access";

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

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    const supabase = createClient();

    // Get workspace_id from request (query params, cookie, or user's default)
    const workspaceId = await getUserWorkspaceIdFromRequest(req);

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID je povinný" },
        { status: 400 }
      );
    }

    // Check if user has access to workspace - batch with owner check
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace nebol nájdený" },
        { status: 404 }
      );
    }

    // Check if user is owner or member - batch check
    const isOwner = workspace.owner_id === user.id;
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!isOwner && !member) {
      return NextResponse.json(
        { success: false, error: "Nemáte prístup k tomuto workspace" },
        { status: 403 }
      );
    }

    const projectAccess = await getProjectAccessContext(workspaceId, user.id);
    const restrictedProjectIds = projectAccess.hasFullProjectAccess
      ? null
      : projectAccess.accessibleProjectIds;
    const projectFilterIds = restrictedProjectIds
      ? restrictedProjectIds.length > 0
        ? restrictedProjectIds
        : ["00000000-0000-0000-0000-000000000000"]
      : null;

    const workspaceOwnerId = workspace.owner_id;

    // Automatically move overdue tasks to today (non-blocking)
    autoMoveOverdueTasksToToday(supabase, workspaceId).catch(() => {
      // Silently fail
    });

    // Check if user has "Riešiteľ" role - optimized single query
    let isRiesitel = false;
    if (!isOwner && member) {
      const isSystemRole = ["owner", "member"].includes(member.role);
      if (!isSystemRole) {
        // Check custom role
        const { data: roleCheck } = await supabase
          .from("roles")
          .select("name")
          .eq("id", member.role)
          .single();

        if (roleCheck?.name === "Riešiteľ") {
          isRiesitel = true;
        }
      }
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const showUnassigned = searchParams.get("show_unassigned") === "true";
    const showAll = searchParams.get("show_all") === "true";

    // Check cache
    const cacheKey = `assigned-tasks:${workspaceId}:${user.id}:${showUnassigned}:${showAll}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "private, max-age=5",
        },
      });
    }

    let tasks;
    let tasksError;

    // Fetch tasks based on filter
    if (isRiesitel || (!showUnassigned && !showAll)) {
      // Show only assigned tasks to current user
      const { data: taskAssignees, error: assigneesError } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId);

      if (assigneesError) {
        return NextResponse.json(
          { success: false, error: assigneesError.message },
          { status: 500 }
        );
      }

      if (!taskAssignees || taskAssignees.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      const taskIds = taskAssignees.map((ta) => ta.task_id);

      let userTasksQuery = supabase
        .from("tasks")
        .select(
          `
          *,
          project:projects(
            id,
            name,
            code,
            workspace_id,
            client:clients(name)
          )
        `
        )
        .in("id", taskIds)
        .eq("workspace_id", workspaceId);

      if (projectFilterIds) {
        userTasksQuery = userTasksQuery.in("project_id", projectFilterIds);
      }

      const { data: userTasks, error: userTasksError } = await userTasksQuery;

      tasks = userTasks;
      tasksError = userTasksError;
    } else if (showUnassigned) {
      // Show unassigned tasks
      const { data: tasksWithAssignees } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("workspace_id", workspaceId);

      const taskIdsWithAssignees = new Set(tasksWithAssignees?.map((ta) => ta.task_id) || []);

      let allTasksQuery = supabase
        .from("tasks")
        .select(
          `
          *,
          project:projects(
            id,
            name,
            code,
            workspace_id,
            client:clients(name)
          )
        `
        )
        .eq("workspace_id", workspaceId)
        .neq("status", "done")
        .neq("status", "cancelled");

      if (projectFilterIds) {
        allTasksQuery = allTasksQuery.in("project_id", projectFilterIds);
      }

      const { data: allTasks, error: allTasksError } = await allTasksQuery;

      tasks = allTasks?.filter((task) => !taskIdsWithAssignees.has(task.id)) || [];
      tasksError = allTasksError;
    } else if (showAll) {
      // Show all active assigned tasks
      const { data: tasksWithAssignees } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("workspace_id", workspaceId);

      const taskIdsWithAssignees = tasksWithAssignees?.map((ta) => ta.task_id) || [];

      if (taskIdsWithAssignees.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      let allTasksQuery = supabase
        .from("tasks")
        .select(
          `
          *,
          project:projects(
            id,
            name,
            code,
            workspace_id,
            client:clients(name)
          )
        `
        )
        .eq("workspace_id", workspaceId)
        .neq("status", "done")
        .neq("status", "cancelled")
        .in("id", taskIdsWithAssignees);

      if (projectFilterIds) {
        allTasksQuery = allTasksQuery.in("project_id", projectFilterIds);
      }

      const { data: allTasks, error: allTasksError } = await allTasksQuery;

      tasks = allTasks;
      tasksError = allTasksError;
    }

    if (tasksError) {
      return NextResponse.json({ success: false, error: tasksError.message }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // OPTIMIZED: Batch load all assignees, workspace members, and profiles at once
    const taskIds = tasks.map((t) => t.id);

    // Load all assignees for all tasks in one query
    const { data: allAssignees } = await supabase
      .from("task_assignees")
      .select("id, task_id, user_id, assigned_at, assigned_by")
      .in("task_id", taskIds)
      .eq("workspace_id", workspaceId);

    // Get all unique user IDs from assignees
    const allUserIds = Array.from(new Set(allAssignees?.map((a) => a.user_id) || []));

    // Load all workspace members in one query
    const { data: workspaceMembers } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .in("user_id", allUserIds.length > 0 ? allUserIds : ["00000000-0000-0000-0000-000000000000"]); // Dummy ID if empty

    const memberUserIds = new Set(workspaceMembers?.map((m) => m.user_id) || []);
    if (workspaceOwnerId) {
      memberUserIds.add(workspaceOwnerId);
    }

    // Load all profiles in one query
    const validUserIds = allUserIds.filter((id) => memberUserIds.has(id));
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, email, role")
      .in("id", validUserIds.length > 0 ? validUserIds : ["00000000-0000-0000-0000-000000000000"]);

    // Create lookup maps for O(1) access
    const assigneesByTaskId = new Map<string, typeof allAssignees>();
    const profilesById = new Map<
      string,
      { id: string; display_name: string | null; email: string; role: string }
    >();

    // Group assignees by task_id
    allAssignees?.forEach((assignee) => {
      if (!assigneesByTaskId.has(assignee.task_id)) {
        assigneesByTaskId.set(assignee.task_id, []);
      }
      assigneesByTaskId.get(assignee.task_id)!.push(assignee);
    });

    // Create profile lookup map
    allProfiles?.forEach((profile) => {
      profilesById.set(profile.id, profile);
    });

    // Map tasks with assignees using in-memory lookups
    const tasksWithAssignees = tasks.map((task) => {
      const assignees = assigneesByTaskId.get(task.id) || [];
      const validAssignees = assignees.filter((a) => memberUserIds.has(a.user_id));

      const assigneesWithUsers = validAssignees.map((assignee) => {
        const profile = profilesById.get(assignee.user_id);
        return {
          ...assignee,
          user: profile
            ? {
                id: profile.id,
                email: profile.email,
                name: profile.display_name,
                avatar_url: null,
                role: profile.role,
                is_active: true,
                created_at: "",
                updated_at: "",
              }
            : null,
        };
      });

      return {
        ...task,
        assignees: assigneesWithUsers,
      };
    });

    // Transform data and calculate time until deadline
    const now = new Date();
    const transformedTasks = tasksWithAssignees
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
      .filter((task) => task.status !== "done" && task.status !== "invoiced")
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

    const response = {
      success: true,
      data: transformedTasks,
    };

    // Cache the response
    setCache(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=5",
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Neznáma chyba" }, { status: 500 });
  }
}
