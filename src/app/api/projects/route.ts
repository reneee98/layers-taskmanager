import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/validations/project";
import { validateSchema } from "@/lib/zod-helpers";
import { getServerUser } from "@/lib/auth";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("client_id");
    const excludeStatus = searchParams.get("exclude_status");

    // First, get all projects filtered by workspace
    let query = supabase
      .from("projects")
      .select("*, client:clients(*)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (status) {
      // Handle multiple statuses separated by comma
      if (status.includes(',')) {
        const statuses = status.split(',');
        query = query.in("status", statuses);
      } else {
        query = query.eq("status", status);
      }
    }

    // Note: We'll handle excludeStatus filtering after the query

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data: allProjects, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    if (!allProjects || allProjects.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Apply excludeStatus filtering if needed
    let filteredProjects = allProjects;
    if (excludeStatus) {
      const statusesToExclude = excludeStatus.includes(',') 
        ? excludeStatus.split(',') 
        : [excludeStatus];
      filteredProjects = allProjects.filter(project => 
        !statusesToExclude.includes(project.status)
      );
    }

    // Get all invoiced tasks
    const { data: invoicedTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("project_id")
      .eq("status", "invoiced");

    if (tasksError) {
      return NextResponse.json({ success: false, error: tasksError.message }, { status: 400 });
    }

    // Get project IDs that have invoiced tasks
    const invoicedProjectIds = new Set(
      (invoicedTasks || []).map(task => task.project_id)
    );

    // Filter out projects that have invoiced tasks
    const activeProjects = filteredProjects.filter(project => 
      !invoicedProjectIds.has(project.id)
    );

    // Convert hourly_rate_cents back to hourly_rate for frontend compatibility
    const projectsWithHourlyRate = activeProjects.map(project => ({
      ...project,
      hourly_rate: project.hourly_rate_cents ? project.hourly_rate_cents / 100 : null
    }));

    return NextResponse.json({ success: true, data: projectsWithHourlyRate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    console.log("Project creation request body:", body);
    
    const validation = validateSchema(projectSchema, body);

    if (!validation.success) {
      console.log("Validation failed:", validation);
      return NextResponse.json(validation, { status: 400 });
    }

    const supabase = createClient();

    // Check if code is unique within workspace
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("code", validation.data.code)
      .eq("workspace_id", workspaceId)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Kód projektu už existuje" },
        { status: 400 }
      );
    }

    // Convert hourly_rate to hourly_rate_cents
    const projectData = {
      ...validation.data,
      workspace_id: workspaceId,
      client_id: validation.data.client_id || null,
      hourly_rate_cents: validation.data.hourly_rate ? Math.round(validation.data.hourly_rate * 100) : null
    };
    
    // Remove hourly_rate from data since we're using hourly_rate_cents
    delete projectData.hourly_rate;

    const { data: project, error } = await supabase
      .from("projects")
      .insert(projectData)
      .select("*, client:clients(*)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Convert hourly_rate_cents back to hourly_rate for frontend compatibility
    const projectWithHourlyRate = {
      ...project,
      hourly_rate: project.hourly_rate_cents ? project.hourly_rate_cents / 100 : null
    };

    return NextResponse.json({ success: true, data: projectWithHourlyRate }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

