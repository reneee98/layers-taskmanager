import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validations/task";
import { validateSchema } from "@/lib/zod-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assigned_to");
    const parentTaskId = searchParams.get("parent_task_id");

    let query = supabase
      .from("tasks")
      .select("*, project:projects(id, name, code)")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo);
    }

    if (parentTaskId) {
      query = query.eq("parent_task_id", parentTaskId);
    } else if (parentTaskId === null || searchParams.has("root_only")) {
      // Filter for root tasks only (no parent)
      query = query.is("parent_task_id", null);
    }

    const { data: tasks, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateSchema(taskSchema, body);

    if (!validation.success) {
      return NextResponse.json(validation, { status: 400 });
    }

    const supabase = createClient();

    // Get the max order_index for this project
    const { data: maxOrderTask } = await supabase
      .from("tasks")
      .select("order_index")
      .eq("project_id", validation.data.project_id)
      .is("parent_task_id", validation.data.parent_task_id || null)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    const nextOrderIndex = maxOrderTask ? (maxOrderTask.order_index || 0) + 1 : 0;

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        ...validation.data,
        order_index: validation.data.order_index ?? nextOrderIndex,
      })
      .select("*, project:projects(id, name, code)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

