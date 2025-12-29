import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isWorkspaceOwner } from "@/lib/auth/workspace-security";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceId: string; userId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, userId } = params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ success: false, error: "Role is required" }, { status: 400 });
    }

    // Check if it's a system role (owner, member) or custom role (UUID)
    const isSystemRole = ['owner', 'member'].includes(role);
    
    // If it's a custom role, verify it exists
    if (!isSystemRole) {
      const { data: customRole, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('id', role)
        .single();
      
      if (roleError || !customRole) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid role. Role not found" 
        }, { status: 400 });
      }
    }

    // Check if current user is owner of the workspace
    const isOwner = await isWorkspaceOwner(workspaceId, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: "Only workspace owners can change user roles" }, { status: 403 });
    }

    // Prevent owner from changing their own role
    if (userId === user.id) {
      return NextResponse.json({ success: false, error: "Cannot change your own role" }, { status: 400 });
    }

    // Prevent changing the role of another owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspace?.owner_id === userId) {
      return NextResponse.json({ success: false, error: "Cannot change the role of another workspace owner" }, { status: 400 });
    }

    if (isSystemRole) {
      // System role: update workspace_members.role
      const { error: updateError } = await supabase
        .from('workspace_members')
        .update({ role: role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (updateError) {
        console.error("Error updating user role:", updateError);
        return NextResponse.json({ success: false, error: "Failed to update user role" }, { status: 500 });
      }

      // Remove custom role if exists
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId);
    } else {
      // Custom role: update user_roles table
      // First, set workspace_members.role to 'member' (default)
      const { error: updateMemberError } = await supabase
        .from('workspace_members')
        .update({ role: 'member' })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (updateMemberError) {
        console.error("Error updating workspace member role:", updateMemberError);
        return NextResponse.json({ success: false, error: "Failed to update user role" }, { status: 500 });
      }

      // Check if user_roles entry already exists
      const { data: existingUserRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .single();

      if (existingUserRole) {
        // Update existing user_roles entry
        const { error: updateUserRoleError } = await supabase
          .from('user_roles')
          .update({ role_id: role })
          .eq('user_id', userId)
          .eq('workspace_id', workspaceId);

        if (updateUserRoleError) {
          console.error("Error updating user role:", updateUserRoleError);
          return NextResponse.json({ success: false, error: "Failed to update user role" }, { status: 500 });
        }
      } else {
        // Create new user_roles entry
        const { error: insertUserRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role_id: role,
            workspace_id: workspaceId
          });

        if (insertUserRoleError) {
          console.error("Error creating user role:", insertUserRoleError);
          return NextResponse.json({ success: false, error: "Failed to update user role" }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "User role updated successfully",
      role: role 
    });
  } catch (error) {
    console.error("Error in user role PATCH:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
