import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/validations/client";
import { validateSchema } from "@/lib/zod-helpers";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";
import { isAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is admin (admins have access to all workspaces)
    const userIsAdmin = await isAdmin(user.id);
    
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    
    // For admins, if no workspace ID from request, try to get any workspace
    let finalWorkspaceId = workspaceId;
    if (!workspaceId && userIsAdmin) {
      const { data: anyWorkspace } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .single();
      
      if (anyWorkspace) {
        finalWorkspaceId = anyWorkspace.id;
      }
    }
    
    if (!finalWorkspaceId) {
      return NextResponse.json({ 
        success: false, 
        error: "Workspace not found. Please ensure you have access to a workspace." 
      }, { status: 400 });
    }

    const { data: clients, error } = await supabase
      .from("clients")
      .select("*")
      .eq("workspace_id", finalWorkspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: clients || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const body = await request.json();
    const validation = validateSchema(clientSchema, body);

    if (!validation.success) {
      return NextResponse.json(validation, { status: 400 });
    }

    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 });
    }

    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        ...validation.data,
        workspace_id: workspaceId,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: client }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

