import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// GET - Get all permissions
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    
    let query = supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true });
    
    if (resource) {
      query = query.eq('resource', resource);
    }
    
    const { data: permissions, error } = await query;
    
    if (error) {
      console.error("Error fetching permissions:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch permissions" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: permissions });
  } catch (error) {
    console.error("Error in permissions GET:", error);
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

