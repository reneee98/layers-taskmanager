import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { updateSettingsSchema } from "@/lib/validations/user";

export async function GET(request: NextRequest) {
  // Settings are temporarily disabled
  return NextResponse.json({ 
    success: false, 
    error: "Settings are temporarily disabled" 
  }, { status: 503 });
}

export async function PATCH(request: NextRequest) {
  // Settings are temporarily disabled
  return NextResponse.json({ 
    success: false, 
    error: "Settings are temporarily disabled" 
  }, { status: 503 });
}
