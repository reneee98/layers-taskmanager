import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { userId, email, display_name } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: "User ID and email are required" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get display_name from user metadata if not provided
    let finalDisplayName = display_name;
    
    if (!finalDisplayName) {
      // Try to get it from user metadata
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser?.user?.user_metadata?.display_name) {
        finalDisplayName = authUser.user.user_metadata.display_name;
      }
    }
    
    // Fallback to email prefix if still no display_name
    if (!finalDisplayName) {
      finalDisplayName = email.split("@")[0] || "User";
    }

    // Create profile using service role (bypasses RLS)
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email: email,
        display_name: finalDisplayName,
        role: email === "design@renemoravec.sk" ? "admin" : "member",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // If profile already exists (unique constraint violation), that's okay
      if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("already exists")) {
        return NextResponse.json({
          success: true,
          message: "Profile already exists",
        });
      }

      // Log the error but don't fail - profile might be created by other means
      console.error("Error creating profile:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.code 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    console.error("Error in create-profile API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

