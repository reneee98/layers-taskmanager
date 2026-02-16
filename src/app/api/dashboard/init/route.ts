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
    const workspaceId = await getUserWorkspaceIdFromRequest(req);

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID je povinný" },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `dashboard-init:${workspaceId}:${user.id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "private, max-age=5",
        },
      });
    }

    // OPTIMIZED: Load workspace and member check in parallel
    const [workspaceResult, memberResult] = await Promise.all([
      supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single(),
      supabase
        .from("workspace_members")
        .select("id, role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single(),
    ]);

    const workspace = workspaceResult.data;
    if (workspaceResult.error || !workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace nebol nájdený" },
        { status: 404 }
      );
    }

    const isOwner = workspace.owner_id === user.id;
    const member = memberResult.data;

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
    const restrictedProjectIdSet = restrictedProjectIds ? new Set(restrictedProjectIds) : null;
    const projectFilterIds = restrictedProjectIds
      ? restrictedProjectIds.length > 0
        ? restrictedProjectIds
        : ["00000000-0000-0000-0000-000000000000"]
      : null;

    const workspaceOwnerId = workspace.owner_id;

    // Auto-move overdue tasks (non-blocking)
    autoMoveOverdueTasksToToday(supabase, workspaceId).catch(() => {});

    // Check if user has "Riešiteľ" role
    let isRiesitel = false;
    if (!isOwner && member) {
      const isSystemRole = ["owner", "member"].includes(member.role);
      if (!isSystemRole) {
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

    let projectsQuery = supabase
      .from("projects")
      .select("*, client:clients(*)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (projectFilterIds) {
      projectsQuery = projectsQuery.in("id", projectFilterIds);
    }

    // OPTIMIZED: Load all data in parallel
    const [
      // Tasks data
      assignedTaskAssignees,
      allTaskAssignees,
      // Workspace data
      allWorkspaceMembers,
      // Projects
      projectsResult,
      // Activities
      activitiesResult,
      // Workspace invitations
      invitationsResult,
    ] = await Promise.all([
      // Get assigned tasks for user (if not Riešiteľ, this will be filtered later)
      isRiesitel
        ? supabase
            .from("task_assignees")
            .select("task_id")
            .eq("user_id", user.id)
            .eq("workspace_id", workspaceId)
        : supabase
            .from("task_assignees")
            .select("task_id")
            .eq("user_id", user.id)
            .eq("workspace_id", workspaceId),
      // Get all tasks with assignees
      supabase.from("task_assignees").select("task_id").eq("workspace_id", workspaceId),
      // Workspace members
      supabase
        .from("workspace_members")
        .select("id, role, user_id")
        .eq("workspace_id", workspaceId),
      // Projects
      projectsQuery,
      // Activities
      (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return supabase
          .from("activities")
          .select(`id, type, action, details, metadata, created_at, project_id, task_id, user_id`)
          .eq("workspace_id", workspaceId)
          .gte("created_at", today.toISOString())
          .lt("created_at", tomorrow.toISOString())
          .order("created_at", { ascending: false })
          .limit(50);
      })(),
      // Invitations
      supabase
        .from("workspace_invitations")
        .select(`*, workspace:workspaces(id, name, description, owner_id)`)
        .eq("email", user.email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
    ]);

    // Get profiles for workspace members
    const memberUserIds = new Set<string>();
    memberUserIds.add(workspaceOwnerId);
    allWorkspaceMembers.data?.forEach((m: any) => memberUserIds.add(m.user_id));

    const userIdsArray = Array.from(memberUserIds);

    // Fetch profiles for workspace members
    const { data: profilesData } =
      userIdsArray.length > 0
        ? await supabase
            .from("profiles")
            .select("id, email, display_name, role")
            .in("id", userIdsArray)
        : { data: [] };

    // OPTIMIZED: Process tasks - get all task IDs first, then fetch all tasks in one query
    const assignedTaskIds = new Set(assignedTaskAssignees.data?.map((ta: any) => ta.task_id) || []);
    const allTaskIdsWithAssignees = new Set(
      allTaskAssignees.data?.map((ta: any) => ta.task_id) || []
    );

    // OPTIMIZED: Fetch all active tasks in one query instead of 3 separate queries
    let allActiveTasksQuery = supabase
      .from("tasks")
      .select(
        `id, title, description, status, priority, estimated_hours, actual_hours, start_date, end_date, due_date, created_at, updated_at, project_id, assignee_id, assigned_to, budget_cents, workspace_id, project:projects(id, name, code, workspace_id, client:clients(name))`
      )
      .eq("workspace_id", workspaceId)
      .neq("status", "done")
      .neq("status", "cancelled");

    if (projectFilterIds) {
      allActiveTasksQuery = allActiveTasksQuery.in("project_id", projectFilterIds);
    }

    const { data: allActiveTasksData } = await allActiveTasksQuery;

    const allTasks = allActiveTasksData || [];

    // Filter tasks in memory (much faster than 3 separate queries)
    const assignedTasks = allTasks.filter((task: any) => assignedTaskIds.has(task.id));
    const allActiveTasks = allTasks.filter((task: any) => allTaskIdsWithAssignees.has(task.id));
    const unassignedTasks = allTasks.filter((task: any) => !allTaskIdsWithAssignees.has(task.id));

    // Get all task IDs for assignees lookup
    const allTaskIds = new Set<string>();
    allTasks.forEach((task: any) => allTaskIds.add(task.id));

    // Batch load assignees and profiles
    const { data: allAssignees } =
      allTaskIds.size > 0
        ? await supabase
            .from("task_assignees")
            .select("id, task_id, user_id, assigned_at, assigned_by")
            .in("task_id", Array.from(allTaskIds))
            .eq("workspace_id", workspaceId)
        : { data: [] };

    const assigneeUserIds = Array.from(new Set(allAssignees?.map((a: any) => a.user_id) || []));
    const validAssigneeUserIds = assigneeUserIds.filter((id) => memberUserIds.has(id));
    const { data: assigneeProfiles } =
      validAssigneeUserIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, display_name, email, role")
            .in("id", validAssigneeUserIds)
        : { data: [] };

    // Create lookup maps
    const assigneesByTaskId = new Map<string, any[]>();
    const profilesById = new Map<string, any>();

    allAssignees?.forEach((assignee: any) => {
      if (!assigneesByTaskId.has(assignee.task_id)) {
        assigneesByTaskId.set(assignee.task_id, []);
      }
      assigneesByTaskId.get(assignee.task_id)!.push(assignee);
    });

    // Merge all profiles (workspace members + assignees)
    const allProfilesMap = new Map<string, any>();
    [...(profilesData || []), ...(assigneeProfiles || [])].forEach((profile: any) => {
      allProfilesMap.set(profile.id, profile);
    });

    // Ensure all workspace member IDs have profiles (even if null)
    userIdsArray.forEach((userId: string) => {
      if (!allProfilesMap.has(userId)) {
        // Create a minimal profile entry
        allProfilesMap.set(userId, {
          id: userId,
          email: null,
          display_name: null,
          role: null,
        });
      }
    });

    // Copy to profilesById
    allProfilesMap.forEach((profile, id) => {
      profilesById.set(id, profile);
    });

    // Enrich tasks with assignees
    const enrichTasks = (taskList: any[]) => {
      return taskList.map((task: any) => {
        const assignees = assigneesByTaskId.get(task.id) || [];
        const validAssignees = assignees.filter((a: any) => memberUserIds.has(a.user_id));

        const assigneesWithUsers = validAssignees.map((assignee: any) => {
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
    };

    // Transform and sort tasks
    const now = new Date();
    const transformAndSort = (taskList: any[]) => {
      return enrichTasks(taskList)
        .map((task: any) => {
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
        .filter((task: any) => task.status !== "done" && task.status !== "invoiced")
        .sort((a: any, b: any) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
    };

    // Process activities
    const activitiesRaw = activitiesResult.data || [];
    const activities = restrictedProjectIdSet
      ? activitiesRaw.filter(
          (activity: any) => !activity.project_id || restrictedProjectIdSet.has(activity.project_id)
        )
      : activitiesRaw;
    const activityProjectIds = Array.from(
      new Set(activities.map((a: any) => a.project_id).filter(Boolean))
    );
    const activityTaskIds = Array.from(
      new Set(activities.map((a: any) => a.task_id).filter(Boolean))
    );
    const activityUserIds = Array.from(
      new Set(activities.map((a: any) => a.user_id).filter(Boolean))
    );

    const [activityProjects, activityTasks, activityUsers] = await Promise.all([
      activityProjectIds.length > 0
        ? supabase.from("projects").select("id, name, code").in("id", activityProjectIds)
        : Promise.resolve({ data: [] }),
      activityTaskIds.length > 0
        ? supabase.from("tasks").select("id, title").in("id", activityTaskIds)
        : Promise.resolve({ data: [] }),
      activityUserIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, display_name, email, avatar_url")
            .in("id", activityUserIds)
        : Promise.resolve({ data: [] }),
    ]);

    const projectsById = new Map((activityProjects.data || []).map((p: any) => [p.id, p]));
    const tasksById = new Map((activityTasks.data || []).map((t: any) => [t.id, t]));
    const usersById = new Map((activityUsers.data || []).map((u: any) => [u.id, u]));

    const formattedActivities = activities.map((activity: any) => {
      const project = activity.project_id ? projectsById.get(activity.project_id) : null;
      const task = activity.task_id ? tasksById.get(activity.task_id) : null;
      const user = activity.user_id ? usersById.get(activity.user_id) : null;

      return {
        id: activity.id,
        type: activity.type,
        action: activity.action,
        details: activity.details,
        project: project?.name,
        project_id: activity.project_id,
        project_code: project?.code,
        task_title: task?.title,
        task_id: activity.task_id,
        user: user?.display_name || "Neznámy používateľ",
        user_email: user?.email,
        user_name: user?.display_name,
        user_avatar_url: user?.avatar_url,
        created_at: activity.created_at,
        metadata: activity.metadata,
      };
    });

    // Format workspace users
    const memberRoleMap = new Map<string, string>();
    allWorkspaceMembers.data?.forEach((m: any) => memberRoleMap.set(m.user_id, m.role));

    const workspaceUsers = userIdsArray.map((userId: string) => {
      const profile = profilesById.get(userId);
      let userRole = "member";
      if (userId === workspaceOwnerId) {
        userRole = "owner";
      } else if (memberRoleMap.has(userId)) {
        userRole = memberRoleMap.get(userId) || "member";
      }

      const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Neznámy";

      return {
        id: profile?.id || userId,
        email: profile?.email || `user-${userId.substring(0, 8)}@unknown`,
        name: displayName,
        display_name: displayName,
        avatar_url: null,
        role: userRole,
      };
    });

    const response = {
      success: true,
      data: {
        tasks: {
          assigned: transformAndSort(assignedTasks),
          allActive: transformAndSort(allActiveTasks),
          unassigned: transformAndSort(unassignedTasks),
        },
        projects: projectsResult.data || [],
        activities: formattedActivities,
        workspaceUsers: workspaceUsers,
        invitations: invitationsResult.data || [],
      },
    };

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
