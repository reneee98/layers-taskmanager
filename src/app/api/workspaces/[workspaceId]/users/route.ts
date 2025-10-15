import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    console.log("=== API GET USERS DEBUG ===");
    console.log("Request URL:", request.url);
    console.log("Request headers:", Object.fromEntries(request.headers.entries()));
    
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("API Debug - User:", user ? { id: user.id, email: user.email } : "null");
    console.log("API Debug - Auth error:", authError);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
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
    const formattedMembers = members.map(m => ({
      user_id: m.user_id,
      role: m.role,
      display_name: m.profiles?.display_name || m.profiles?.email || 'Unknown User',
      email: m.profiles?.email,
      is_owner: workspace.owner_id === m.user_id,
      joined_at: m.created_at,
    }));

    return NextResponse.json({ success: true, data: formattedMembers });
  } catch (error) {
    console.error("Error in workspace users GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = params;
    const body = await request.json();
    const { email, role = 'member' } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    // Check if current user is owner of the workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    if (workspace.owner_id !== user.id) {
      return NextResponse.json({ success: false, error: "Only workspace owners can add users" }, { status: 403 });
    }

    // Find user by email
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ success: false, error: "User with this email not found" }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ success: false, error: "User is already a member of this workspace" }, { status: 400 });
    }

    // Add user to workspace
    const { error: insertError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: targetUser.id,
        role: role
      });

    if (insertError) {
      console.error("Error adding user to workspace:", insertError);
      return NextResponse.json({ success: false, error: "Failed to add user to workspace" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "User added to workspace successfully",
      user_id: targetUser.id,
      email: email,
      role: role
    });
  } catch (error) {
    console.error("Error in workspace users POST:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
