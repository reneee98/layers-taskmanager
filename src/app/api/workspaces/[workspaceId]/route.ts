import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient();

    // Get workspace with check if user has access
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or member
    const isOwner = workspace.owner_id === user.id;
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!isOwner && !member) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: workspace });
  } catch (error) {
    console.error("Error in GET /api/workspaces/[workspaceId]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const supabase = createClient();

    // Check if user is owner (only owners can update workspace)
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    if (workspace.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only workspace owner can update workspace" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.company_name !== undefined) updateData.company_name = body.company_name;
    if (body.company_tax_id !== undefined) updateData.company_tax_id = body.company_tax_id;
    if (body.company_address !== undefined) updateData.company_address = body.company_address;
    if (body.company_phone !== undefined) updateData.company_phone = body.company_phone;
    if (body.company_email !== undefined) updateData.company_email = body.company_email;

    // Update workspace
    const { data: updatedWorkspace, error: updateError } = await supabase
      .from("workspaces")
      .update(updateData)
      .eq("id", workspaceId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating workspace:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update workspace" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updatedWorkspace });
  } catch (error) {
    console.error("Error in PATCH /api/workspaces/[workspaceId]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

