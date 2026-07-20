import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth/permissions";
import { canAccessProject } from "@/lib/auth/project-access";
import { computeTaskFinance } from "@/server/finance/computeTaskFinance";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, workspace_id, project_id")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
    }

    if (task.project_id) {
      const hasProjectAccess = await canAccessProject(task.workspace_id, task.project_id, user.id);
      if (!hasProjectAccess) {
        return NextResponse.json({ success: false, error: "Nemáte prístup k tejto úlohe" }, { status: 403 });
      }
    }

    const canViewCosts = await hasPermission(user.id, "financial", "view_costs", task.workspace_id);
    if (!canViewCosts) {
      return NextResponse.json(
        { success: false, error: "Nemáte oprávnenie na zobrazenie finančných údajov" },
        { status: 403 }
      );
    }

    const finance = await computeTaskFinance(taskId);

    if (!finance) {
      return NextResponse.json(
        { success: false, error: "Úloha nebola nájdená" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: finance });
  } catch (error) {
    console.error("Task Finance API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Neznáma chyba"
      },
      { status: 500 }
    );
  }
}
