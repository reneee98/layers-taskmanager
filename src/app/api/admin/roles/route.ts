import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// GET - Get all roles
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    
    const supabase = createClient();
    
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error("Error fetching roles:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch roles" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error("Error in roles GET:", error);
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new role
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    
    const supabase = createClient();
    const body = await request.json();
    const { name, description } = body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Role name is required" }, { status: 400 });
    }
    
    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        name: name.trim(),
        description: description || null,
        is_system_role: false
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating role:", error);
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ success: false, error: "Role with this name already exists" }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: "Failed to create role" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error) {
    console.error("Error in roles POST:", error);
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

