import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: "Chýbajú povinné parametre" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    if (type === 'project') {
      // Restore all invoiced tasks in the project back to done
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id")
        .eq("project_id", id)
        .eq("status", "invoiced");

      if (tasksError) {
        return NextResponse.json(
          { success: false, error: tasksError.message },
          { status: 500 }
        );
      }

      if (tasks.length === 0) {
        return NextResponse.json(
          { success: false, error: "Projekt nemá vyfaktúrované úlohy" },
          { status: 400 }
        );
      }

      // Update all invoiced tasks back to done status
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ 
          status: "done",
          invoiced_at: null
        })
        .in("id", tasks.map(t => t.id));

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }

    } else if (type === 'task') {
      // Restore single task back to done
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ 
          status: "done",
          invoiced_at: null
        })
        .eq("id", id)
        .eq("status", "invoiced");

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }

    } else {
      return NextResponse.json(
        { success: false, error: "Neplatný typ" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'project' ? 'Projekt' : 'Úloha'} bola obnovená`,
    });

  } catch (error) {
    console.error("Error restoring:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
