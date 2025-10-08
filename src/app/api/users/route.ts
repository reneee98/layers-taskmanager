import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Failed to fetch users:", error);
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa načítať používateľov" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error in users API:", error);
    return NextResponse.json(
      { success: false, error: "Vnútorná chyba servera" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email: body.email,
        name: body.name,
        role: body.role || "designer",
        avatar_url: body.avatar_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create user:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, error: "Nepodarilo sa vytvoriť používateľa" },
      { status: 500 }
    );
  }
}
