import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    console.log("=== TEST AUTH API ===");
    
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("User:", user ? { id: user.id, email: user.email } : "null");
    console.log("Auth error:", authError);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Unauthorized",
        authError: authError?.message 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email },
      message: "Auth working!" 
    });
  } catch (error) {
    console.error("Test auth error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
