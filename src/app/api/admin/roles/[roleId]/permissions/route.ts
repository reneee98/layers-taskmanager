import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// GET - Get permissions for a role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    await requireAdmin();
    
    const { roleId } = await params;
    const supabase = createClient();
    
    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select('permission_id, permissions(*)')
      .eq('role_id', roleId);
    
    if (error) {
      console.error("Error fetching role permissions:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch permissions" }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: permissions?.map((rp: any) => rp.permissions) || []
    });
  } catch (error) {
    console.error("Error in role permissions GET:", error);
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST - Update permissions for a role
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    await requireAdmin();
    
    const { roleId } = await params;
    const supabase = createClient();
    const body = await request.json();
    const { permission_ids } = body;
    
    if (!Array.isArray(permission_ids)) {
      return NextResponse.json({ success: false, error: "permission_ids must be an array" }, { status: 400 });
    }
    
    // Check if role exists
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('id', roleId)
      .single();
    
    if (roleError || !role) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }
    
    // Validate all permission IDs exist
    if (permission_ids.length > 0) {
      const { data: permissions, error: permError } = await supabase
        .from('permissions')
        .select('id')
        .in('id', permission_ids);
      
      if (permError) {
        console.error("Error validating permissions:", permError);
        return NextResponse.json({ success: false, error: "Failed to validate permissions" }, { status: 500 });
      }
      
      if (permissions.length !== permission_ids.length) {
        return NextResponse.json({ success: false, error: "Some permission IDs are invalid" }, { status: 400 });
      }
    }
    
    // Delete existing permissions for this role
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);
    
    if (deleteError) {
      console.error("Error deleting existing permissions:", deleteError);
      return NextResponse.json({ success: false, error: "Failed to update permissions" }, { status: 500 });
    }
    
    // Insert new permissions
    if (permission_ids.length > 0) {
      const rolePermissions = permission_ids.map((permId: string) => ({
        role_id: roleId,
        permission_id: permId
      }));
      
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);
      
      if (insertError) {
        console.error("Error inserting permissions:", insertError);
        return NextResponse.json({ success: false, error: "Failed to update permissions" }, { status: 500 });
      }
    }
    
    // Fetch updated permissions
    const { data: updatedPermissions, error: fetchError } = await supabase
      .from('role_permissions')
      .select('permission_id, permissions(*)')
      .eq('role_id', roleId);
    
    if (fetchError) {
      console.error("Error fetching updated permissions:", fetchError);
    }
    
    return NextResponse.json({
      success: true,
      data: updatedPermissions?.map((rp: any) => rp.permissions) || [],
      message: "Permissions updated successfully"
    });
  } catch (error) {
    console.error("Error in role permissions POST:", error);
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

