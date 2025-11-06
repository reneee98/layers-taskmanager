import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// GET - Get single role with permissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    await requireAdmin();
    
    const { roleId } = await params;
    const supabase = createClient();
    
    // Get role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();
    
    if (roleError || !role) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }
    
    // Get permissions for this role
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('permission_id, permissions(*)')
      .eq('role_id', roleId);
    
    if (permError) {
      console.error("Error fetching permissions:", permError);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...role,
        permissions: permissions?.map((rp: any) => rp.permissions) || []
      }
    });
  } catch (error) {
    console.error("Error in role GET:", error);
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    await requireAdmin();
    
    const { roleId } = await params;
    const supabase = createClient();
    const body = await request.json();
    const { name, description } = body;
    
    // Check if role exists and is not a system role
    const { data: existingRole, error: checkError } = await supabase
      .from('roles')
      .select('is_system_role')
      .eq('id', roleId)
      .single();
    
    if (checkError || !existingRole) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }
    
    if (existingRole.is_system_role) {
      return NextResponse.json({ success: false, error: "Cannot modify system roles" }, { status: 400 });
    }
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ success: false, error: "Role name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description || null;
    }
    
    const { data: role, error } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating role:", error);
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ success: false, error: "Role with this name already exists" }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: "Failed to update role" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error("Error in role PATCH:", error);
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    await requireAdmin();
    
    const { roleId } = await params;
    const supabase = createClient();
    
    // Check if role exists and is not a system role
    const { data: existingRole, error: checkError } = await supabase
      .from('roles')
      .select('is_system_role')
      .eq('id', roleId)
      .single();
    
    if (checkError || !existingRole) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }
    
    if (existingRole.is_system_role) {
      return NextResponse.json({ success: false, error: "Cannot delete system roles" }, { status: 400 });
    }
    
    // Check if role is assigned to any users
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role_id', roleId)
      .limit(1);
    
    if (userRolesError) {
      console.error("Error checking user roles:", userRolesError);
    }
    
    if (userRoles && userRoles.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Cannot delete role that is assigned to users. Please remove all assignments first." 
      }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);
    
    if (error) {
      console.error("Error deleting role:", error);
      return NextResponse.json({ success: false, error: "Failed to delete role" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error in role DELETE:", error);
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

