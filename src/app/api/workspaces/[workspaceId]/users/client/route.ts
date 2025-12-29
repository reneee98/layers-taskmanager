import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    console.log("=== CLIENT API GET USERS DEBUG ===");
    
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("Client API Debug - User:", user ? { id: user.id, email: user.email } : "null");
    console.log("Client API Debug - Auth error:", authError);
    
    if (authError || !user) {
      console.error("Client Auth error:", authError);
      return NextResponse.json({ success: false, error: "Unauthorized", details: authError?.message }, { status: 401 });
    }

    const { workspaceId } = params;

    // Check if current user has access to the workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Check if user is owner or member
    const isOwner = workspace.owner_id === user.id;
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!isOwner && !member) {
      return NextResponse.json({ success: false, error: "Access denied - not a member of this workspace" }, { status: 403 });
    }

    // Get workspace members
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select(`
        user_id,
        role,
        created_at,
        profiles (
          id,
          display_name,
          email
        )
      `)
      .eq('workspace_id', workspaceId);

    if (membersError) {
      console.error("Error fetching workspace members:", membersError);
      return NextResponse.json({ success: false, error: "Failed to fetch workspace members" }, { status: 500 });
    }

    // Format members data
    const formattedMembers = members.map(m => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return {
        user_id: m.user_id,
        role: m.role,
        display_name: profile?.display_name || profile?.email || 'Unknown User',
        email: profile?.email,
        is_owner: workspace.owner_id === m.user_id,
        joined_at: m.created_at,
      };
    });

    return NextResponse.json({ success: true, data: formattedMembers });
  } catch (error) {
    console.error("Error in client workspace users GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
