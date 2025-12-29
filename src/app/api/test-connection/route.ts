import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Test basic connection
    const supabase = createClient();
    
    // Try to get session (this will test connection)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    return NextResponse.json({
      success: true,
      connection: {
        url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET',
        urlExists: !!supabaseUrl,
        anonKeyExists: !!supabaseAnonKey,
        serviceKeyExists: !!serviceKey,
        sessionError: sessionError?.message || null,
        hasSession: !!session,
      },
      note: "If connection fails, check DNS/network or Supabase URL"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}



