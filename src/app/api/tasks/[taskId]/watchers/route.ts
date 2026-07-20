import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/tasks/[taskId]/watchers
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
      .from("task_watchers")
      .select("user_id, added_at, profiles(id, display_name, email, avatar_url)")
      .eq("task_id", taskId);

    if (error) throw error;

    const watchers = (data ?? []).map((row: any) => ({
      user_id: row.user_id,
      added_at: row.added_at,
      ...row.profiles,
    }));

    const isWatching = watchers.some((w: any) => w.user_id === user.id);
    return NextResponse.json({ success: true, data: watchers, isWatching });
  } catch (error) {
    console.error("[GET /api/tasks/[taskId]/watchers]", error);
    return NextResponse.json({ success: false, error: "Chyba servera" }, { status: 500 });
  }
}

// POST /api/tasks/[taskId]/watchers — current user watches task
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

    const { error } = await supabase
      .from("task_watchers")
      .insert({ task_id: taskId, user_id: user.id });

    if (error && error.code !== "23505") throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/tasks/[taskId]/watchers]", error);
    return NextResponse.json({ success: false, error: "Chyba servera" }, { status: 500 });
  }
}

// DELETE /api/tasks/[taskId]/watchers — current user unwatches
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

    const { error } = await supabase
      .from("task_watchers")
      .delete()
      .eq("task_id", taskId)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/tasks/[taskId]/watchers]", error);
    return NextResponse.json({ success: false, error: "Chyba servera" }, { status: 500 });
  }
}
