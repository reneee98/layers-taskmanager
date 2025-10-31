import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export async function POST(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get user's personal project or first active project
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, code")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .limit(1);

    if (projectsError || !projects || projects.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Nenašiel sa žiadny aktívny projekt. Vytvorte najprv projekt." 
      }, { status: 404 });
    }

    const projectId = projects[0].id;

    // Date: November 1, current year (Saturday)
    const currentYear = new Date().getFullYear();
    const dueDate = `${currentYear}-11-01`;

    // Dummy task titles
    const dummyTasks = [
      "Review design mockups",
      "Update documentation",
      "Fix critical bug in login",
      "Prepare presentation slides",
      "Code review for PR #123",
      "Meeting with client",
      "Deploy to staging",
      "Write unit tests",
      "Update dependencies",
      "Optimize database queries"
    ];

    const statuses = ["todo", "in_progress", "review", "sent_to_client"];
    const priorities = ["low", "medium", "high", "urgent"];

    // Get max order_index
    const { data: maxOrderTask } = await supabase
      .from("tasks")
      .select("order_index")
      .eq("project_id", projectId)
      .eq("workspace_id", workspaceId)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    let nextOrderIndex = maxOrderTask ? (maxOrderTask.order_index || 0) + 1 : 0;

    // Create tasks
    const tasksToInsert = dummyTasks.map((title, index) => ({
      project_id: projectId,
      workspace_id: workspaceId,
      title,
      description: `Dummy úloha číslo ${index + 1} pre testovanie kalendára`,
      status: statuses[index % statuses.length],
      priority: priorities[index % priorities.length],
      due_date: dueDate,
      estimated_hours: Math.floor(Math.random() * 8) + 1, // Random 1-8 hours
      order_index: nextOrderIndex + index,
    }));

    const { data: insertedTasks, error: insertError } = await supabase
      .from("tasks")
      .insert(tasksToInsert)
      .select("*, project:projects(id, name, code)");

    if (insertError) {
      return NextResponse.json({ 
        success: false, 
        error: insertError.message 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      data: insertedTasks,
      message: `Úspešne vytvorených ${insertedTasks.length} dummy úloh na ${dueDate}` 
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating dummy tasks:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

