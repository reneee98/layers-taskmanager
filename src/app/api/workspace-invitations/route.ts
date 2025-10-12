import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createClient();
    
    // Get pending invitations for this user's email
    const { data: invitations, error } = await supabase
      .from('workspace_invitations')
      .select(`
        *,
        workspace:workspaces(id, name, description, owner_id)
      `)
      .eq('email', user.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching invitations:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch invitations" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: invitations || [] });
  } catch (error) {
    console.error("Error in workspace invitations GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
