import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProjectAccessContext } from "@/lib/auth/project-access";

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 10 * 1000; // 10 seconds

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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get workspace_id from request query params
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID je povinný" },
        { status: 400 }
      );
    }

    const [workspaceResult, membershipResult] = await Promise.all([
      supabase.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle(),
      supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const workspace = workspaceResult.data;
    const isOwner = workspace?.owner_id === user.id;
    const isMember = Boolean(membershipResult.data);

    if (!workspace || (!isOwner && !isMember)) {
      return NextResponse.json(
        { success: false, error: "Nemáte prístup k tomuto workspace" },
        { status: 403 }
      );
    }

    const projectAccess = await getProjectAccessContext(workspaceId, user.id);
    const restrictedProjectIdSet = projectAccess.hasFullProjectAccess
      ? null
      : new Set(projectAccess.accessibleProjectIds);

    // Get query params
    const onlyToday = searchParams.get("only_today") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    // Check cache
    const cacheKey = `activity:${workspaceId}:${onlyToday}:${page}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "private, max-age=10",
        },
      });
    }

    // Build query
    let query = supabase
      .from("activities")
      .select(
        `
        id,
        type,
        action,
        details,
        metadata,
        created_at,
        project_id,
        task_id,
        user_id
      `
      )
      .eq("workspace_id", workspaceId);

    // Apply date filter if only_today is true
    if (onlyToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      query = query.gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString());
    }

    const { data: activitiesData, error: activitiesError } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (activitiesError) {
      return NextResponse.json(
        { success: false, error: "Chyba pri načítavaní aktivít" },
        { status: 500 }
      );
    }

    const activities = restrictedProjectIdSet
      ? (activitiesData || []).filter(
          (activity) => !activity.project_id || restrictedProjectIdSet.has(activity.project_id)
        )
      : activitiesData || [];

    if (activities.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // OPTIMIZED: Load all related data in parallel
    const projectIds = Array.from(
      new Set(activities.map((a) => a.project_id).filter(Boolean) || [])
    );
    const taskIds = Array.from(new Set(activities.map((a) => a.task_id).filter(Boolean) || []));
    const userIds = Array.from(new Set(activities.map((a) => a.user_id).filter(Boolean) || []));

    // Load all related data in parallel
    const [projectsResult, tasksResult, usersResult] = await Promise.all([
      projectIds.length > 0
        ? supabase.from("projects").select("id, name, code").in("id", projectIds)
        : Promise.resolve({ data: [] }),
      taskIds.length > 0
        ? supabase.from("tasks").select("id, title").in("id", taskIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase.from("profiles").select("id, display_name, email, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] }),
    ]);

    const projects = projectsResult.data || [];
    const tasks = tasksResult.data || [];
    const users = usersResult.data || [];

    // Create lookup maps for O(1) access
    const projectsById = new Map(projects.map((p) => [p.id, p]));
    const tasksById = new Map(tasks.map((t) => [t.id, t]));
    const usersById = new Map(users.map((u) => [u.id, u]));

    // Format activities for frontend using lookups
    const formattedActivities = activities.map((activity) => {
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

    const response = {
      success: true,
      data: formattedActivities,
    };

    // Cache the response
    setCache(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=10",
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
