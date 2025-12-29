import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    await requireAdmin();
    
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Add search filter if provided
    if (search) {
      query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
    }
    
    const { data: users, error } = await query;
    
    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error in users GET:", error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}