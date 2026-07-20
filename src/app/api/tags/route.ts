import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

// GET /api/tags - list all tags for the workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace nenájdený" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name");

    if (error) throw error;
    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    console.error("[GET /api/tags]", error);
    return NextResponse.json({ success: false, error: "Chyba servera" }, { status: 500 });
  }
}

// POST /api/tags - create a new tag
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace nenájdený" }, { status: 404 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Názov tagu je povinný" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tags")
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        color: color || "#6366f1",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ success: false, error: "Tag s týmto názvom už existuje" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[POST /api/tags]", error);
    return NextResponse.json({ success: false, error: "Chyba servera" }, { status: 500 });
  }
}
