import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, getServerUser } from "@/lib/auth/admin";
import { updateProfileSchema, updateUserRoleSchema } from "@/lib/validations/user";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    // Users can view their own profile, admins can view all
    const isOwnProfile = user.id === params.id;
    const isAdmin = await requireAdmin().then(() => true).catch(() => false);
    
    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("Error in user GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const isOwnProfile = user.id === params.id;
    const isAdmin = await requireAdmin().then(() => true).catch(() => false);
    
    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    
    // Validate input based on what's being updated
    let updateData: any = {};
    
    if (body.role !== undefined) {
      // Only admins can change roles
      if (!isAdmin) {
        return NextResponse.json({ success: false, error: "Only admins can change roles" }, { status: 403 });
      }
      
      const roleValidation = updateUserRoleSchema.safeParse({ role: body.role });
      if (!roleValidation.success) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid role", 
          details: roleValidation.error.issues 
        }, { status: 400 });
      }
      
      updateData.role = body.role;
    } else {
      // Regular profile update
      const profileValidation = updateProfileSchema.safeParse(body);
      if (!profileValidation.success) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid profile data", 
          details: profileValidation.error.issues 
        }, { status: 400 });
      }
      
      updateData = profileValidation.data;
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating user profile:", error);
      return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in user PATCH:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only admins can delete users
    await requireAdmin();
    
    const supabase = createClient();
    
    // Prevent admin from deleting themselves
    const currentUser = await getServerUser();
    if (currentUser?.id === params.id) {
      return NextResponse.json({ success: false, error: "Cannot delete your own account" }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json({ success: false, error: "Failed to delete user" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in user DELETE:", error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
