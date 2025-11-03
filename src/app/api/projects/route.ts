import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/validations/project";
import { validateSchema } from "@/lib/zod-helpers";
import { getServerUser } from "@/lib/auth";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { generateProjectCode, generateUniqueProjectCode } from "@/lib/generate-project-code";

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

    // Check if we're requesting archived projects (completed/cancelled)
    const isArchivedRequest = status && (
      status === 'completed' || 
      status === 'cancelled' || 
      (status.includes(',') && status.split(',').map(s => s.trim()).every(s => s === 'completed' || s === 'cancelled'))
    );

    let finalProjects: any[] = [];

    // For archived projects, use same logic as /api/invoices/archived - get projects with invoiced tasks
    if (isArchivedRequest) {
      // Get all invoiced tasks (same as in /api/invoices/archived)
      const { data: invoicedTasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          project_id,
          project:projects(*, client:clients(*))
        `)
        .eq("workspace_id", workspaceId)
        .eq("status", "invoiced")
        .not("project_id", "is", null);

      if (tasksError) {
        return NextResponse.json({ success: false, error: tasksError.message }, { status: 400 });
      }

      // Get unique projects from invoiced tasks
      const projectMap = new Map();
      (invoicedTasks || []).forEach((task: any) => {
        if (task.project && task.project_id && !projectMap.has(task.project_id)) {
          projectMap.set(task.project_id, task.project);
        }
      });

      // Also get projects with status completed/cancelled
      const { data: completedProjects, error: completedError } = await supabase
        .from("projects")
        .select("*, client:clients(*)")
        .eq("workspace_id", workspaceId)
        .in("status", ["completed", "cancelled"]);

      if (!completedError && completedProjects) {
        completedProjects.forEach((project: any) => {
          if (!projectMap.has(project.id)) {
            projectMap.set(project.id, project);
          }
        });
      }

      finalProjects = Array.from(projectMap.values());

      // Apply client filter if specified
      if (clientId) {
        finalProjects = finalProjects.filter((p: any) => p.client_id === clientId);
      }

    } else {
      // For active projects, use normal filtering
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

      // Filter out projects with invoiced tasks (only for active projects)
      const { data: invoicedTasks, error: tasksError } = await supabase
        .from("tasks")
        .select("project_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "invoiced");

      if (tasksError) {
        return NextResponse.json({ success: false, error: tasksError.message }, { status: 400 });
      }

      const invoicedProjectIds = new Set(
        (invoicedTasks || []).map(task => task.project_id).filter(Boolean)
      );

      finalProjects = filteredProjects.filter(project => 
        !invoicedProjectIds.has(project.id)
      );
    }

    // Convert hourly_rate_cents and budget_cents back to hourly_rate and fixed_fee for frontend compatibility
    const projectsWithHourlyRate = finalProjects.map(project => ({
      ...project,
      hourly_rate: project.hourly_rate_cents ? project.hourly_rate_cents / 100 : null,
      fixed_fee: project.budget_cents ? project.budget_cents / 100 : null
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

    // Get all existing project codes in this workspace to ensure uniqueness
    const { data: existingProjects, error: fetchError } = await supabase
      .from("projects")
      .select("code")
      .eq("workspace_id", workspaceId);

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: "Chyba pri načítaní existujúcich projektov" },
        { status: 500 }
      );
    }

    const existingCodes = (existingProjects || []).map(p => p.code).filter(Boolean) as string[];

    // Check if provided code already exists
    let projectCode = validation.data.code;
    
    if (existingCodes.includes(projectCode)) {
      // Code already exists, generate a unique one automatically
      if (validation.data.name) {
        // Generate unique code based on project name
        projectCode = await generateUniqueProjectCode(validation.data.name, existingCodes);
      } else {
        // If no name, try to generate from existing code pattern
        const baseCode = projectCode.split('-')[0];
        const pattern = new RegExp(`^${baseCode}-(\\d+)$`);
        let maxNumber = 0;

        for (const code of existingCodes) {
          const match = code.match(pattern);
          if (match) {
            const number = parseInt(match[1], 10);
            if (number > maxNumber) {
              maxNumber = number;
            }
          }
        }

        const nextNumber = maxNumber + 1;
        projectCode = `${baseCode}-${nextNumber.toString().padStart(3, "0")}`;
      }
    }

    // Convert hourly_rate to hourly_rate_cents and fixed_fee to budget_cents
    const projectData = {
      ...validation.data,
      code: projectCode, // Use the generated unique code
      workspace_id: workspaceId,
      client_id: validation.data.client_id || null,
      hourly_rate_cents: validation.data.hourly_rate ? Math.round(validation.data.hourly_rate * 100) : null,
      budget_cents: validation.data.fixed_fee ? Math.round(validation.data.fixed_fee * 100) : null
    };
    
    // Remove hourly_rate and fixed_fee from data since we're using hourly_rate_cents and budget_cents
    delete projectData.hourly_rate;
    delete projectData.fixed_fee;

    const { data: project, error } = await supabase
      .from("projects")
      .insert(projectData)
      .select("*, client:clients(*)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Convert hourly_rate_cents and budget_cents back to hourly_rate and fixed_fee for frontend compatibility
    const projectWithHourlyRate = {
      ...project,
      hourly_rate: project.hourly_rate_cents ? project.hourly_rate_cents / 100 : null,
      fixed_fee: project.budget_cents ? project.budget_cents / 100 : null
    };

    return NextResponse.json({ success: true, data: projectWithHourlyRate }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

