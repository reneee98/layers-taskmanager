import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { updateSettingsSchema } from "@/lib/validations/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createClient();
    
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error("Error fetching user settings:", error);
      return NextResponse.json({ success: false, error: "Settings not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Error in settings GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid settings data", 
        details: validation.error.issues 
      }, { status: 400 });
    }
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('user_settings')
      .update(validation.data)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating user settings:", error);
      return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in settings PATCH:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
