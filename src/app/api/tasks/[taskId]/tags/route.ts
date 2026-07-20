import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

// GET /api/tasks/[taskId]/tags
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("task_tags")
      .select("tag_id, added_at, tags(id, name, color)")
      .eq("task_id", taskId);

    if (error) throw error;

    const tags = (data ?? []).map((row: any) => row.tags).filter(Boolean);
    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    console.error("[GET /api/tasks/[taskId]/tags]", error);
    return NextResponse.json({ success: false, error: "Chyba servera" }, { status: 500 });
  }
}

// POST /api/tasks/[taskId]/tags — add a tag to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    const { tagId } = await request.json();
    if (!tagId) {
      return NextResponse.json({ success: false, error: "tagId je povinný" }, { status: 400 });
    }

    const { error } = await supabase
      .from("task_tags")
      .insert({ task_id: taskId, tag_id: tagId, added_by: user.id });

    if (error && error.code !== "23505") throw error; // ignore duplicate

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/tasks/[taskId]/tags]", error);
    return NextResponse.json({ success: false, error: "Chyba servera" }, { status: 500 });
  }
}

// DELETE /api/tasks/[taskId]/tags?tagId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    const tagId = request.nextUrl.searchParams.get("tagId");
    if (!tagId) {
      return NextResponse.json({ success: false, error: "tagId je povinný" }, { status: 400 });
    }

    const { error } = await supabase
      .from("task_tags")
      .delete()
      .eq("task_id", taskId)
      .eq("tag_id", tagId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/tasks/[taskId]/tags]", error);
    return NextResponse.json({ success: false, error: "Chyba servera" }, { status: 500 });
  }
}
