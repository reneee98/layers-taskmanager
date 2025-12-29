import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { getServerUser } from "@/lib/auth/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    // Only allow admin
    const admin = await getServerUser();
    if (!admin || admin.email !== 'design@renemoravec.sk') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    
    if (!serviceClient) {
      return NextResponse.json({ 
        success: false, 
        error: "Service client not available - SUPABASE_SERVICE_ROLE_KEY not set" 
      }, { status: 500 });
    }

    const { workspaceId } = params;

    // Find user by email
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false, 
        error: "User not found" 
      }, { status: 404 });
    }

    // Check if user is workspace owner
    const { data: workspace, error: workspaceError } = await serviceClient
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ 
        success: false, 
        error: "Workspace not found" 
      }, { status: 404 });
    }

    if (workspace.owner_id === profile.id) {
      return NextResponse.json({ 
        success: false, 
        error: "Cannot remove workspace owner. Change workspace owner first." 
      }, { status: 400 });
    }

    // Remove user from workspace_members using service client (bypasses RLS)
    const { error: deleteError } = await serviceClient
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', profile.id);

    if (deleteError) {
      console.error("Error removing user:", deleteError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to remove user",
        details: deleteError.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "User removed successfully",
      user_id: profile.id,
      email: email
    });
  } catch (error: any) {
    console.error("Error in force-remove-user:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}

