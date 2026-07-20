import { NextRequest, NextResponse } from "next/server";
import { computeProjectFinance } from "@/server/finance/computeProjectFinance";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth";
import { canAccessProject } from "@/lib/auth/project-access";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");

    const supabase = createClient();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: "Projekt nebol nájdený" }, { status: 404 });
    }

    const hasAccess = await canAccessProject(project.workspace_id, projectId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Nemáte prístup k tomuto projektu" },
        { status: 403 }
      );
    }

    const canViewCosts = await hasPermission(user.id, "financial", "view_costs", project.workspace_id);
    if (!canViewCosts) {
      return NextResponse.json(
        { success: false, error: "Nemáte oprávnenie na zobrazenie finančných údajov" },
        { status: 403 }
      );
    }

    const finance = await computeProjectFinance(projectId, taskId || undefined);

    if (!finance) {
      return NextResponse.json({ success: false, error: "Projekt nebol nájdený" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: finance });
  } catch (error) {
    console.error("Finance API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Neznáma chyba",
      },
      { status: 500 }
    );
  }
}
