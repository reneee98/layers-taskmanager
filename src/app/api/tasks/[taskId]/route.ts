import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateTaskSchema } from "@/lib/validations/task";
import { validateSchema } from "@/lib/zod-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();

    const { data: task, error } = await supabase
      .from("tasks")
      .select(`
        *,
        project:projects(id, name, code),
        assignee:users!assignee_id(id, name, email, avatar_url)
      `)
      .eq("id", taskId)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  try {
    const body = await request.json();
    const validation = validateSchema(updateTaskSchema, body);

    if (!validation.success) {
      return NextResponse.json(validation, { status: 400 });
    }

    const supabase = createClient();

    const { data: task, error } = await supabase
      .from("tasks")
      .update(validation.data)
      .eq("id", taskId)
      .select(`
        *,
        project:projects(id, name, code),
        assignee:users!assignee_id(id, name, email, avatar_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

