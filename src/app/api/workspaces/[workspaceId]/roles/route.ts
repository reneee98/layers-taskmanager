import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isWorkspaceOwner } from "@/lib/auth/workspace-security";

export const dynamic = "force-dynamic";

// GET - Get all roles (for workspace owners to assign to users)
export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = params;

    // Check if user is workspace owner
    const isOwner = await isWorkspaceOwner(workspaceId, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: "Only workspace owners can view roles" }, { status: 403 });
    }
    
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error("Error fetching roles:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch roles" }, { status: 500 });
    }
    
    // Filter out 'user' role if it exists
    const filteredRoles = roles.filter(role => role.name !== 'user');
    
    return NextResponse.json({ success: true, data: filteredRoles });
  } catch (error) {
    console.error("Error in workspace roles GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}



