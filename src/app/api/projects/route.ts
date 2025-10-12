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

    // First, get all projects filtered by workspace
    let query = supabase
      .from("projects")
      .select("*, client:clients(*)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

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
    const activeProjects = allProjects.filter(project => 
      !invoicedProjectIds.has(project.id)
    );

    return NextResponse.json({ success: true, data: activeProjects });
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

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        ...validation.data,
        workspace_id: workspaceId
      })
      .select("*, client:clients(*)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

