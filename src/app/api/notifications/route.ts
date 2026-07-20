import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/notifications - latest notifications for current user + unread count
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 20, 50);

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, title, body, task_id, project_id, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);

    if (error || countError) throw error || countError;

    return NextResponse.json({
      success: true,
      data: data ?? [],
      unreadCount: count ?? 0,
    });
  } catch (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ success: false, error: "Chyba servera" }, { status: 500 });
  }
}

// PATCH /api/notifications - mark as read
// body: { id: string } for a single notification, or { all: true } for all
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    const body = await request.json();

    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (body?.id) {
      query = query.eq("id", body.id);
    } else if (!body?.all) {
      return NextResponse.json({ success: false, error: "Chýba id alebo all" }, { status: 400 });
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/notifications]", error);
    return NextResponse.json({ success: false, error: "Chyba servera" }, { status: 500 });
  }
}
